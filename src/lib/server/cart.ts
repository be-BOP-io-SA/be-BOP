import { ObjectId } from 'mongodb';
import { collections, withTransaction } from './database';
import {
	checkProductVariationsIntegrity,
	DEFAULT_MAX_QUANTITY_PER_ORDER,
	productPriceWithVariations,
	type Product
} from '$lib/types/Product';
import { error } from '@sveltejs/kit';
import { runtimeConfig } from './runtime-config';
import { amountOfProductReserved, refreshAvailableStockInDb } from './product';
import type { Cart } from '$lib/types/Cart';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import { userQuery } from './user';
import { removeEmpty } from '$lib/utils/removeEmpty';
import { POS_ROLE_ID } from '$lib/types/User';
import { addMinutes } from 'date-fns';
import type { Currency } from '$lib/types/Currency';
import { toCurrency } from '$lib/utils/toCurrency';
import { sum } from '$lib/utils/sum';
import { deepEquals } from '$lib/utils/deep-equals';

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
		mode: 'eshop' | 'nostr' | 'pos';
	}
) {
	if (
		params.user.userRoleId === POS_ROLE_ID
			? !product.actionSettings.retail.canBeAddedToBasket
			: params.mode === 'eshop'
			? !product.actionSettings.eShop.canBeAddedToBasket
			: params.mode === 'nostr'
			? !product.actionSettings.nostr.canBeAddedToBasket
			: !product.actionSettings.retail.canBeAddedToBasket
	) {
		throw error(400, "Product can't be added to basket ");
	}

	if (params.customPrice && !product.payWhatYouWant) {
		throw error(400, 'Product is not pay what you want');
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
		throw error(
			400,
			`Product price must be less than ${product.maximumPrice.amount} ${product.maximumPrice.currency}`
		);
	}

	if (params.customPrice && product.type === 'subscription') {
		throw error(400, 'Product is a subscription, cannot set custom price');
	}

	if (quantity < 0) {
		throw new TypeError('Quantity cannot be negative');
	}

	if (product.availableDate && !product.preorder && product.availableDate > new Date()) {
		throw error(400, 'Product is not available for preorder');
	}

	const depositPercentage = product.deposit?.enforce
		? product.deposit.percentage
		: product.deposit && params.deposit
		? product.deposit.percentage
		: undefined;

	let cart = await getCartFromDb({ user: params.user });
	if (
		runtimeConfig.cartMaxSeparateItems &&
		cart.items.length >= runtimeConfig.cartMaxSeparateItems
	) {
		throw error(400, 'Cart has too many items');
	}
	const existingItem = cart.items.find(
		(item) =>
			item.productId === product._id &&
			// Just in case a null value is stored in the DB
			(item.depositPercentage ?? undefined) === (depositPercentage ?? undefined)
	);

	const totalQuantityInCart = () =>
		sum(cart.items.filter((item) => item.productId === product._id).map((item) => item.quantity));

	const availableAmount = await computeAvailableAmount(product, cart);

	if (availableAmount <= 0) {
		throw error(400, 'Product is out of stock');
	}

	if (product.standalone) {
		if (quantity !== 1) {
			throw error(400, 'You can only order one of this product');
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
		throw error(400, 'error matching on variations choice');
	}

	if (existingItem && !product.standalone && !product.bookingSpec) {
		existingItem.quantity = params.totalQuantity ? quantity : existingItem.quantity + quantity;

		const max = Math.min(
			product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER,
			availableAmount
		);

		if (totalQuantityInCart() > max) {
			throw error(400, `You can only order ${max} of this product`);
		}

		if (product.type === 'subscription') {
			existingItem.quantity = 1;
		}
		existingItem.reservedUntil = addMinutes(new Date(), runtimeConfig.reserveStockInMinutes);
	} else {
		if (totalQuantityInCart() + quantity > availableAmount) {
			throw error(400, `You can only order ${availableAmount} of this product`);
		}
		cart.items.push({
			productId: product._id,
			quantity: product.type === 'subscription' ? 1 : quantity,
			...(params.customPrice && {
				customPrice: params.customPrice
			}),
			...(params.chosenVariations && {
				chosenVariations: params.chosenVariations
			}),
			reservedUntil: addMinutes(new Date(), runtimeConfig.reserveStockInMinutes),
			...(depositPercentage && { depositPercentage })
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
	params: { user: UserIdentifier; totalQuantity?: boolean; depositPercentage?: number }
) {
	if (quantity < 0) {
		throw new TypeError('Quantity cannot be negative');
	}

	const cart = await getCartFromDb(params);

	let item = cart.items.find(
		(i) =>
			i.productId === product._id &&
			(i.depositPercentage ?? undefined) === (params.depositPercentage ?? undefined)
	);

	// Like when calling from nostr handle message, we don't know which deposit percentage was used
	if (!item) {
		item = cart.items.find((i) => i.productId === product._id);
	}

	if (!item) {
		return cart;
	}

	const newQty = params.totalQuantity ? quantity : Math.max(item.quantity - quantity, 0);

	const availableAmount = await computeAvailableAmount(product, cart);

	item.quantity = Math.min(
		availableAmount,
		newQty,
		product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER
	);

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

async function computeAvailableAmount(product: Product, cart: Cart): Promise<number> {
	return !product.stock
		? Infinity
		: product.stock.total -
				(await amountOfProductReserved(product._id, {
					exclude: {
						sessionId: cart.user.sessionId,
						npub: cart.user.npub
					}
				}));
}

export async function checkCartItems(
	items: Array<{
		quantity: number;
		product: Pick<Product, 'stock' | '_id' | 'name' | 'maxQuantityPerOrder'>;
	}>,
	opts?: {
		user?: UserIdentifier;
	}
) {
	const products = items.map((item) => item.product);
	const productById = Object.fromEntries(products.map((product) => [product._id, product]));

	// be careful, there can be multiple lines for the same product due to product.standalone
	const qtyPerItem: Record<string, number> = {};
	for (const item of items) {
		qtyPerItem[item.product._id] = (qtyPerItem[item.product._id] || 0) + item.quantity;
	}

	for (const productId of Object.keys(qtyPerItem)) {
		const product = productById[productId];
		const available = product.stock
			? product.stock.total - (await amountOfProductReserved(productId, { exclude: opts?.user }))
			: Infinity;
		if (product.stock && qtyPerItem[productId] > available) {
			if (!available) {
				throw error(400, 'Product is out of stock: ' + product.name);
			}
			throw error(
				400,
				'Not enough stock for product: ' + product.name + ', only ' + available + ' left'
			);
		}

		if (qtyPerItem[productId] > (product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER)) {
			throw error(
				400,
				'Cannot order more than ' +
					(product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER) +
					' of product: ' +
					product.name
			);
		}
	}
}
