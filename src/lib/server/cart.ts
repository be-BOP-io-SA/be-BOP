import { ObjectId } from 'mongodb';
import { collections, withTransaction } from './database';
import {
	checkProductVariationsIntegrity,
	productPriceWithVariations,
	type Product
} from '$lib/types/Product';
import { error } from '@sveltejs/kit';
import { runtimeConfig } from './runtime-config';
import { refreshAvailableStockInDb, resolveAvailableAmounts } from './product';
import type { Cart } from '$lib/types/Cart';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import { userQuery } from './user';
import { removeEmpty } from '$lib/utils/removeEmpty';
import { addDays, addMinutes } from 'date-fns';
import { isSameDayInShopTz, sameDayBookingStatus } from '$lib/utils/sameDayBooking';
import type { Currency } from '$lib/types/Currency';
import { toCurrency } from '$lib/utils/toCurrency';
import { sum } from '$lib/utils/sum';
import { deepEquals } from '$lib/utils/deep-equals';
import {
	evaluateSaleLocks,
	orderLimitLocks,
	saleLockMessage,
	SALE_LOCK_CODES,
	type ProductWithSaleLocks,
	type SaleLock
} from './saleLock';

export const CART_ERROR_CODES = [
	'NOT_FOR_SALE',
	'NOT_PWYW',
	'BOOKING_INFO_REQUIRED',
	'BOOKING_SAME_DAY_DISABLED',
	'BOOKING_SAME_DAY_CUTOFF_PASSED',
	'MAX_PRICE_EXCEEDED',
	'SUBSCRIPTION_CUSTOM_PRICE',
	'NOT_PREORDER',
	'MAX_ITEMS_REACHED',
	'OUT_OF_STOCK',
	'STANDALONE_QTY_ONE',
	'VARIATION_INVALID',
	'MAX_PER_ORDER',
	...SALE_LOCK_CODES
] as const;
export type CartErrorCode = (typeof CART_ERROR_CODES)[number];

function cartError(
	code: CartErrorCode,
	message: string,
	params?: Record<string, string | number>
): never {
	throw error(400, { code, message, ...(params && { params }) });
}

/**
 * Re-applies a server-side cart snapshot atomically and releases any reserved
 * stock for items that were dropped or kept. Returns false when the snapshot
 * id does not match — protects against forged ids from the client.
 */
export async function restoreFromPendingSnapshot(
	cart: Cart,
	snapshotId: string
): Promise<{ restored: boolean }> {
	if (cart.pendingSnapshot?.id !== snapshotId) {
		return { restored: false };
	}
	const restoredItems = cart.pendingSnapshot.items;
	const allProductIds = new Set<string>([
		...cart.items.map((i) => i.productId),
		...restoredItems.map((i) => i.productId)
	]);
	await withTransaction(async (session) => {
		await collections.carts.updateOne(
			{ _id: cart._id, 'pendingSnapshot.id': snapshotId },
			{
				$set: { items: restoredItems, updatedAt: new Date() },
				$unset: { pendingSnapshot: '' }
			},
			{ session }
		);
		for (const productId of allProductIds) {
			await refreshAvailableStockInDb(productId, session);
		}
	});
	return { restored: true };
}

export async function getCartFromDb(params: { user: UserIdentifier }): Promise<Cart> {
	let res = await collections.carts.findOne(userQuery(params.user), { sort: { _id: -1 } });

	if (!res) {
		res = {
			_id: new ObjectId(),
			items: [],
			createdAt: new Date(),
			updatedAt: new Date(),
			user: params.user
		};
	}

	if (!deepEquals(removeEmpty(res.user), removeEmpty(params.user))) {
		res.user = params.user;
		res.updatedAt = new Date();
		await collections.carts.updateOne(
			{
				_id: res._id
			},
			{
				$set: {
					user: params.user,
					updatedAt: res.updatedAt
				}
			}
		);
	}

	return res;
}

function canAddToCart(
	product: Product,
	user: UserIdentifier,
	actionMechanism: 'eshop' | 'nostr' | 'pos'
): boolean {
	switch (actionMechanism) {
		case 'pos':
			return !!user.userHasPosOptions && product.actionSettings.retail.canBeAddedToBasket;
		case 'eshop':
			return product.actionSettings.eShop.canBeAddedToBasket;
		case 'nostr':
			return product.actionSettings.nostr.canBeAddedToBasket;
		default:
			actionMechanism satisfies never;
			return false;
	}
}

export function findItemInCart(
	cart: Cart,
	productId: string,
	lineId?: string,
	/**
	 * When `lineId` is provided, `depositPercentage` is ignored
	 */
	depositPercentage?: number
) {
	return cart.items.find(
		(item) =>
			item.productId === productId &&
			(lineId
				? item._id === lineId
				: depositPercentage
				? item.depositPercentage === depositPercentage
				: true)
	);
}

/**
 * Be wary if adding Zod: called from NostR as well and need human readable error messages
 */
export async function addToCartInDb(
	product: Product,
	quantity: number,
	params: {
		user: UserIdentifier;
		totalQuantity?: boolean;
		customPrice?: { amount: number; currency: Currency };
		deposit?: boolean;
		chosenVariations?: Record<string, string>;
		booking?: {
			time: Date;
			durationMinutes: number;
			bookedDates?: Date[];
		};
		lineId?: string;
		cart?: Cart;
		mode: 'eshop' | 'nostr' | 'pos';
	}
) {
	if (!canAddToCart(product, params.user, params.mode)) {
		cartError('NOT_FOR_SALE', "Product can't be added to basket ");
	}

	if (params.customPrice && !product.payWhatYouWant) {
		cartError('NOT_PWYW', 'Product is not pay what you want');
	}

	if (product.bookingSpec && !params.booking) {
		cartError(
			'BOOKING_INFO_REQUIRED',
			'Product is a booking, please provide booking time and duration'
		);
	}

	// Same-day rule for 24h-slot bookings. Defense in depth — the date picker already greys out
	// today, but a direct POST (curl, Nostr, stale tab) could still bypass the client check.
	// All comparisons happen in the shop's timezone via the shared helper.
	if (product.bookingSpec && params.booking) {
		const spec = product.bookingSpec;
		const now = new Date();
		const tz = spec.schedule.timezone;
		const datesToCheck = params.booking.bookedDates?.length
			? params.booking.bookedDates
			: [params.booking.time];
		const includesToday = datesToCheck.some((d) => isSameDayInShopTz(d, now, tz));
		if (includesToday) {
			const status = sameDayBookingStatus(spec, now);
			if (status === 'disabled') {
				cartError('BOOKING_SAME_DAY_DISABLED', 'Same-day booking is not allowed for this product');
			}
			if (status === 'cutoffPassed') {
				const maxHour = spec.sameDayBookingMaxHour ?? '14:00';
				cartError(
					'BOOKING_SAME_DAY_CUTOFF_PASSED',
					`Same-day booking cutoff (${maxHour}) has passed`,
					{ maxHour }
				);
			}
		}
	}

	if (
		params.customPrice &&
		product.payWhatYouWant &&
		product.maximumPrice &&
		toCurrency(
			params.customPrice.currency,
			product.maximumPrice.amount,
			product.maximumPrice.currency
		) < params.customPrice.amount
	) {
		cartError(
			'MAX_PRICE_EXCEEDED',
			`Product price must be less than ${product.maximumPrice.amount} ${product.maximumPrice.currency}`,
			{ max: product.maximumPrice.amount, currency: product.maximumPrice.currency }
		);
	}

	if (params.customPrice && product.type === 'subscription') {
		cartError('SUBSCRIPTION_CUSTOM_PRICE', 'Product is a subscription, cannot set custom price');
	}

	if (quantity < 0) {
		throw new TypeError('Quantity cannot be negative');
	}

	if (product.availableDate && !product.preorder && product.availableDate > new Date()) {
		cartError('NOT_PREORDER', 'Product is not available for preorder');
	}

	const depositPercentage = product.deposit?.enforce
		? product.deposit.percentage
		: product.deposit && params.deposit
		? product.deposit.percentage
		: undefined;

	let cart = params.cart ?? (await getCartFromDb({ user: params.user }));
	if (
		runtimeConfig.cartMaxSeparateItems &&
		cart.items.length >= runtimeConfig.cartMaxSeparateItems
	) {
		cartError('MAX_ITEMS_REACHED', 'Cart has too many items');
	}
	const existingItem = findItemInCart(cart, product._id, params.lineId, depositPercentage);

	const totalQuantityInCart = () =>
		sum(cart.items.filter((item) => item.productId === product._id).map((item) => item.quantity));

	// Sale locks, refused at the door. Every way into the cart lands here — the product page,
	// a pre-configured cart link, the point-of-sale alias field, NostR — so none of them needs
	// its own copy of the rules. Evaluated once the cart is known, because a per-person cap
	// counts what already sits in it on top of what was already ordered.
	// The cart's own "+" and quantity field send the new total, not what to add. Counting the
	// cart again on top of it would read a cart of six asking for seven as thirteen, and refuse
	// a button that only meant to go from six to seven.
	const alreadyInCart = params.totalQuantity ? 0 : totalQuantityInCart();

	const lockOnAdd = (
		await evaluateSaleLocks([product], params.user, {
			// A subscription line is clamped to one unit whatever was asked, but a subscription is
			// standalone: a second add makes a second line rather than merging. So what the cart
			// already holds has to count, or the same subscription piles up in one order.
			extraQuantityByProductId: {
				[product._id]: product.type === 'subscription' ? 1 : quantity
			},
			quantityInCartByProductId: { [product._id]: alreadyInCart },
			availableByProductId: await resolveAvailableAmounts([product], params.user)
		})
	).get(product._id);
	if (lockOnAdd?.length) {
		// One code and its params travel on the error — the first reason, which is the most
		// actionable. The message carries every reason; the pages read the evaluator directly
		// and show them all.
		cartError(lockOnAdd[0].code, saleLockMessage(lockOnAdd, product.name), lockOnAdd[0].params);
	}

	if (product.standalone || product.bookingSpec) {
		if (quantity !== 1) {
			cartError('STANDALONE_QTY_ONE', 'You can only order one of this product');
		}
	}

	if (params.customPrice) {
		params.customPrice.amount = Math.max(
			params.customPrice.amount,
			toCurrency(params.customPrice.currency, product.price.amount, product.price.currency)
		);
	} else if (
		product.variations?.length &&
		checkProductVariationsIntegrity(product, params.chosenVariations)
	) {
		params.customPrice = {
			amount: productPriceWithVariations(product, params.chosenVariations),
			currency: product.price.currency
		};
	} else if (product.variations?.length) {
		cartError('VARIATION_INVALID', 'error matching on variations choice');
	}

	// Subscription pricing schedule: when a fresh purchase (no prior subscription for this
	// buyer identity) hits a product with a schedule, price the cart line at phase 1 so cart,
	// checkout and order totals all agree. Renewals never come through addToCart — they call
	// createOrder directly, which resolves the phase from the subscription snapshot there.
	if (product.type === 'subscription' && product.pricingSchedule?.length) {
		const existingSub = await collections.paidSubscriptions.findOne(
			{ ...userQuery(params.user), productId: product._id },
			{ projection: { _id: 1 } }
		);
		if (!existingSub) {
			const phase = product.pricingSchedule[0];
			params.customPrice = {
				amount: phase.priceAmount,
				currency: product.price.currency
			};
		}
	}

	if (existingItem && !product.standalone && !product.bookingSpec) {
		existingItem.quantity = params.totalQuantity ? quantity : existingItem.quantity + quantity;

		if (product.type === 'subscription') {
			existingItem.quantity = 1;
			if (params.customPrice) {
				existingItem.customPrice = params.customPrice;
			}
		}
		existingItem.reservedUntil = addMinutes(new Date(), runtimeConfig.reserveStockInMinutes);
	} else {
		cart.items.push({
			_id: crypto.randomUUID(),
			productId: product._id,
			quantity: product.type === 'subscription' ? 1 : quantity,
			...(params.customPrice && {
				customPrice: params.customPrice
			}),
			...(params.chosenVariations && {
				chosenVariations: params.chosenVariations
			}),
			reservedUntil: addMinutes(new Date(), runtimeConfig.reserveStockInMinutes),
			...(depositPercentage && { depositPercentage }),
			...(params.booking &&
				product.bookingSpec && {
					booking: {
						start: params.booking.time,
						end: params.booking.bookedDates?.length
							? addDays(params.booking.bookedDates[params.booking.bookedDates.length - 1], 1)
							: addMinutes(params.booking.time, params.booking.durationMinutes),
						...(params.booking.bookedDates?.length && { bookedDates: params.booking.bookedDates })
					}
				})
		});
	}

	const validCart = cart;
	await withTransaction(async (session) => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		cart = (
			await collections.carts.findOneAndUpdate(
				{ _id: validCart._id },
				{
					$set: {
						items: validCart.items,
						updatedAt: new Date()
					},
					$setOnInsert: {
						createdAt: new Date(),
						user: params.user
					}
				},
				{ upsert: true, returnDocument: 'after', session }
			)
		).value!;

		for (const item of cart.items) {
			await refreshAvailableStockInDb(item.productId, session);
		}
	});

	return cart;
}

export async function removeFromCartInDb(
	product: Product,
	quantity: number,
	params: {
		user: UserIdentifier;
		totalQuantity?: boolean;
		depositPercentage?: number;
		lineId?: string;
		cart?: Cart;
	}
) {
	if (quantity < 0) {
		throw new TypeError('Quantity cannot be negative');
	}

	const cart = params.cart ?? (await getCartFromDb(params));

	const item = findItemInCart(cart, product._id, params.lineId, params.depositPercentage);

	if (!item) {
		return cart;
	}

	const newQty = params.totalQuantity ? quantity : Math.max(item.quantity - quantity, 0);

	const [limit] = orderLimitLocks(
		product,
		newQty,
		(await resolveAvailableAmounts([product], cart.user))[product._id]
	);
	const allowed = limit?.code === 'OUT_OF_STOCK' ? 0 : Number(limit?.params?.max ?? Infinity);

	item.quantity = Math.min(allowed, newQty, item.quantity);

	if (item.quantity <= 0) {
		cart.items = cart.items.filter((it) => it !== item);
	}

	await withTransaction(async (session) => {
		await collections.carts.updateOne(
			{ _id: cart._id },
			{ $set: { items: cart.items, updatedAt: new Date() } },
			{ session }
		);

		await refreshAvailableStockInDb(product._id, session);
	});

	return cart;
}

export async function checkCartItems(
	items: Array<{
		quantity: number;
		product: Pick<Product, 'stock' | '_id' | 'name' | 'maxQuantityPerOrder' | 'stockReference'> &
			ProductWithSaleLocks;
	}>,
	opts?: {
		user?: UserIdentifier;
	}
) {
	const products = items.map((item) => item.product);

	// be careful, there can be multiple lines for the same product due to product.standalone
	const quantityInCart: Record<string, number> = {};
	for (const item of items) {
		quantityInCart[item.product._id] = (quantityInCart[item.product._id] ?? 0) + item.quantity;
	}
	const availableByProductId = await resolveAvailableAmounts(products, opts?.user);

	// Sale locks, re-asked here and not only on the way in: a cart filled before the shop owner
	// drew a list up, or before a subscription lapsed, would otherwise still check out. This
	// function is what the cart page, the checkout page and order creation all call, so the
	// three give the same answer. Without a customer — a renewal — only stock and the per-order
	// cap apply.
	const locks = opts?.user
		? await evaluateSaleLocks(products, opts.user, {
				// What sits in the cart is what is about to be ordered, so it counts towards a
				// per-person cap alongside what was ordered before.
				extraQuantityByProductId: quantityInCart,
				availableByProductId
		  })
		: new Map(
				products
					.map((product): [string, SaleLock[]] => [
						product._id,
						orderLimitLocks(product, quantityInCart[product._id], availableByProductId[product._id])
					])
					.filter(([, productLocks]) => productLocks.length)
		  );

	const firstLocked = products.find((product) => locks.has(product._id));
	if (firstLocked) {
		const productLocks = locks.get(firstLocked._id) as SaleLock[];
		cartError(productLocks[0].code, saleLockMessage(productLocks, firstLocked.name), {
			...productLocks[0].params,
			products: firstLocked.name
		});
	}
}

export async function removeUserCarts(user: UserIdentifier) {
	await collections.carts.deleteMany({ user });
}
