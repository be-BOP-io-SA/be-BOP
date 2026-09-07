import { addToCartInDb } from '$lib/server/cart';
import { cmsFromContent } from '$lib/server/cms';
import { collections } from '$lib/server/database';
import {
	applyResolvedStock,
	resolveAvailableAmounts,
	resolveStockProduct
} from '$lib/server/product';
import { resolveSubscriptionDuration } from '$lib/server/subscriptions';
import { runtimeConfig } from '$lib/server/runtime-config';
import { evaluateSaleLocks, isSaleLockError, remainingForUser } from '$lib/server/saleLock';
import { adminPrefix as getAdminPrefix } from '$lib/server/admin';
import { identifiedUserQuery, userIdentifier } from '$lib/server/user';
import { CURRENCIES, parsePriceAmount } from '$lib/types/Currency';
import { DEFAULT_MAX_QUANTITY_PER_ORDER, type Product } from '$lib/types/Product';
import { computeVatRate, extractVat } from '$lib/utils/vat';
import { productToScheduleId, type ScheduleEvent } from '$lib/types/Schedule';
import { set } from '$lib/utils/set';
import { sum } from '$lib/utils/sum';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import type { RequestEvent } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import { subDays, parseISO, isValid } from 'date-fns';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';
import {
	collectUserAddresses,
	discountTargetsProduct,
	evaluateDiscountConditions,
	getActivePercentageDiscounts,
	isAuthenticated
} from '$lib/server/discount';
import type { Discount } from '$lib/types/Discount';

async function fetchApplicableDiscount(
	productId: string,
	productTagIds: string[],
	userSubscriptionIds: string[],
	user?: UserIdentifier | null
) {
	// 1. Existing: subscription-based lookup. Discount applies if product matches by id, by tag,
	//    or the discount targets the whole catalog.
	const productTargetMatch = [
		{ wholeCatalog: true },
		{ productIds: productId },
		...(productTagIds.length ? [{ requiredTagIds: { $in: productTagIds } }] : [])
	];
	const subscriptionDiscount = await collections.discounts.findOne(
		{
			$and: [
				{ $or: productTargetMatch },
				{ $or: [{ endsAt: { $gt: new Date() } }, { endsAt: null }] }
			],
			subscriptionIds: { $in: userSubscriptionIds.length ? userSubscriptionIds : ['__none__'] },
			beginsAt: { $lt: new Date() },
			mode: 'percentage'
		},
		{ sort: { percentage: -1 } }
	);

	if (subscriptionDiscount) {
		return subscriptionDiscount;
	}

	// 2. Auto discounts (condition-based, no subscription needed)
	const activeDiscounts = await getActivePercentageDiscounts();
	const applicable = activeDiscounts
		.filter((d) => discountTargetsProduct(d, { _id: productId, tagIds: productTagIds }))
		.filter((d) =>
			evaluateDiscountConditions(d, {
				userSubscriptionIds,
				channel: 'web',
				cartItems: [{ productId, quantity: 1, tagIds: productTagIds }],
				userContactAddresses: collectUserAddresses(user),
				isLoggedIn: isAuthenticated(user)
			})
		)
		.filter((d): d is Extract<Discount, { mode: 'percentage' }> => d.mode === 'percentage')
		.sort((a, b) => b.percentage - a.percentage);

	return applicable[0] ?? null;
}

async function fetchProduct(
	productId: string,
	language: App.Locals['language']
): Promise<Pick<
	Product,
	| '_id'
	| 'name'
	| 'price'
	| 'shortDescription'
	| 'description'
	| 'availableDate'
	| 'preorder'
	| 'customPreorderText'
	| 'type'
	| 'shipping'
	| 'displayShortDescription'
	| 'payWhatYouWant'
	| 'free'
	| 'standalone'
	| 'maxQuantityPerOrder'
	| 'stock'
	| 'actionSettings'
	| 'contentBefore'
	| 'contentAfter'
	| 'deposit'
	| 'cta'
	| 'maximumPrice'
	| 'recommendedPWYWAmount'
	| 'mobile'
	| 'hasVariations'
	| 'variations'
	| 'variationLabels'
	| 'sellDisclaimer'
	| 'hasSellDisclaimer'
	| 'hideFromSEO'
	| 'hideDiscountExpiration'
	| 'bookingSpec'
	| 'vatProfileId'
	| 'stockReference'
	| 'requiresAuthentication'
	| 'whitelist'
	| 'maxQuantityPerUser'
	| 'subscriptionReminderSeconds'
	| 'tagIds'
	| 'subscriptionDuration'
	| 'pricingSchedule'
	| 'alias'
> | null> {
	return collections.products.findOne<ReturnType<Awaited<typeof fetchProduct>>>(
		{ _id: productId },
		{
			projection: {
				_id: 1,
				name: { $ifNull: [`$translations.${language}.name`, '$name'] },
				price: 1,
				shortDescription: {
					$ifNull: [`$translations.${language}.shortDescription`, '$shortDescription']
				},
				description: { $ifNull: [`$translations.${language}.description`, '$description'] },
				availableDate: 1,
				preorder: 1,
				customPreorderText: {
					$ifNull: [`$translations.${language}.customPreorderText`, '$customPreorderText']
				},
				type: 1,
				displayShortDescription: 1,
				payWhatYouWant: 1,
				free: 1,
				standalone: 1,
				maxQuantityPerOrder: 1,
				stock: 1,
				actionSettings: 1,
				contentBefore: {
					$ifNull: [`$translations.${language}.contentBefore`, '$contentBefore']
				},
				contentAfter: {
					$ifNull: [`$translations.${language}.contentAfter`, '$contentAfter']
				},
				deposit: 1,
				cta: { $ifNull: [`$translations.${language}.cta`, '$cta'] },
				hasVariations: 1,
				variationLabels: {
					$ifNull: [`$translations.${language}.variationLabels`, '$variationLabels']
				},
				variations: 1,
				maximumPrice: 1,
				recommendedPWYWAmount: 1,
				mobile: 1,
				sellDisclaimer: {
					$ifNull: [`$translations.${language}.sellDisclaimer`, '$sellDisclaimer']
				},
				hasSellDisclaimer: 1,
				hideFromSEO: 1,
				hideDiscountExpiration: 1,
				shipping: 1,
				bookingSpec: 1,
				vatProfileId: 1,
				stockReference: 1,
				requiresAuthentication: 1,
				whitelist: 1,
				maxQuantityPerUser: 1,
				subscriptionReminderSeconds: 1,
				tagIds: 1,
				subscriptionDuration: 1,
				pricingSchedule: 1,
				alias: 1
			}
		}
	);
}

async function fetchProductPictures(productId: string) {
	return collections.pictures.find({ productId }).sort({ order: 1, createdAt: 1 }).toArray();
}

async function fetchUserSubscriptions(userIdentifier: UserIdentifier) {
	return collections.paidSubscriptions
		.find({
			...identifiedUserQuery(userIdentifier),
			paidUntil: { $gt: new Date() }
		})
		.toArray();
}

async function fetchProductSchedule(productId: string) {
	// todo: filter events by date directly in query
	return collections.schedules.findOne({ _id: productToScheduleId(productId) });
}

async function fetchProductScheduleEvents(productId: string) {
	return collections.scheduleEvents
		.find({
			scheduleId: productToScheduleId(productId),
			status: { $in: ['pending', 'confirmed'] },
			endsAt: { $gt: subDays(new Date(), 1) }
		})
		.sort({ beginsAt: 1 })
		.project<Pick<ScheduleEvent, 'beginsAt' | 'endsAt'>>({
			_id: 0,
			beginsAt: 1,
			endsAt: 1
		})
		.toArray();
}

export const load = async ({ params, parent, locals }) => {
	const productId = params.id;
	const product = await fetchProduct(productId, locals.language);
	if (!product) {
		throw error(404, 'Page not found');
	}
	if (
		locals.user?.hasPosOptions
			? !product.actionSettings.retail.visible
			: !product.actionSettings.eShop.visible
	) {
		throw redirect(303, '/');
	}

	const resolved = product.stockReference?.productId ? await resolveStockProduct(productId) : null;
	if (resolved?.stock) {
		product.stock = resolved.stock;
	}

	const [pictures, userSubscriptions, schedule, scheduleEvents, parentData] = await Promise.all([
		fetchProductPictures(productId),
		fetchUserSubscriptions(userIdentifier(locals)),
		product.bookingSpec ? fetchProductSchedule(productId) : null,
		product.bookingSpec ? fetchProductScheduleEvents(productId) : [],
		parent()
	]);
	const totalFreeProducts = sum(
		userSubscriptions.map((s) => s.freeProductsById?.[product._id]?.available ?? 0)
	);
	const freeProductsInCart = parentData.cart.items
		.map(
			(item, i) =>
				[item.product._id, parentData.cart.priceInfo.perItem[i].usedFreeUnits ?? 0] as const
		)
		.filter((idAndCount) => idAndCount[0] === productId)
		.reduce((acc, idAndCount) => acc + idAndCount[1], 0);
	const freeProductsAvailable = totalFreeProducts - freeProductsInCart;
	const discount = await fetchApplicableDiscount(
		productId,
		product.tagIds ?? [],
		userSubscriptions.map((sub) => sub.productId),
		userIdentifier(locals)
	);

	const vatRate = computeVatRate({
		productVatProfileId: product.vatProfileId,
		vatProfiles: parentData.vatProfiles,
		bebopCountry: runtimeConfig.vatCountry,
		userCountry: locals.countryCode,
		vatSingleCountry: runtimeConfig.vatSingleCountry
	});

	return {
		product: {
			...product,
			vatProfileId: product.vatProfileId?.toString(),
			...(product.type === 'subscription' && {
				subscriptionDuration: resolveSubscriptionDuration(product)
			})
		},
		pictures,
		discount,
		vatRate,
		scheduleEvents: [
			...scheduleEvents,
			...(schedule?.events ?? [])
				.filter((e) => (e.endsAt ?? Infinity) > subDays(new Date(), 1))
				.map((e) => ({
					beginsAt: e.beginsAt,
					endsAt: e.endsAt
				}))
		],
		...(product.contentBefore && {
			productCMSBefore: cmsFromContent({ desktopContent: product.contentBefore }, locals)
		}),
		...(product.contentAfter && {
			productCMSAfter: cmsFromContent({ desktopContent: product.contentAfter }, locals)
		}),
		// Same verdict the cart and the order will give, asked before the click so the CTA can
		// go flat instead of failing after it.
		// Asked as "may they take one more?", which is the question the CTA answers. Without the
		// extra unit a customer sitting exactly on their cap reads nothing, and only finds out by
		// clicking — what the cart already holds counts towards it too.
		// Asked as "may they take one more?", which is the question the CTA answers. Every
		// reason comes back the same way — login, whitelist, per-person cap, per-order cap,
		// stock — so the page states them all before the click instead of letting whichever
		// one happens to fire first surface after it.
		saleLocks:
			(
				await evaluateSaleLocks([product], userIdentifier(locals), {
					extraQuantityByProductId: { [productId]: 1 },
					quantityInCartByProductId: {
						[productId]: sum(
							parentData.cart.items
								.filter((item) => item.product._id === productId)
								.map((item) => item.quantity)
						)
					},
					availableByProductId: await resolveAvailableAmounts([product], userIdentifier(locals))
				})
			).get(product._id) ?? [],
		// How many more units this person may take, so the quantity picker cannot offer a number
		// the cart will refuse. Undefined on an uncapped product.
		maxPerUserRemaining: await remainingForUser(product, userIdentifier(locals)),
		showCheckoutButton: runtimeConfig.checkoutButtonOnProductPage,
		priceHistoryEnabled: runtimeConfig.priceHistoryEnabled,
		websiteShortDescription: product.shortDescription,
		freeProductsAvailable,
		adminPrefix: getAdminPrefix()
	};
};

async function addToCart({ params, request, locals }: RequestEvent) {
	const productDoc = await collections.products.findOne({ alias: params.id });
	if (!productDoc) {
		throw error(404, 'Product not found');
	}
	const product = await applyResolvedStock(productDoc);

	const formData = await request.formData();

	const json: JsonObject = {};
	for (const [key, value] of formData) {
		set(json, key, value);
	}

	const {
		quantity,
		customPriceAmount,
		customPriceCurrency,
		deposit,
		chosenVariations,
		time,
		durationMinutes,
		bookedDates
	} = z
		.object({
			quantity: z
				.number({ coerce: true })
				.int()
				.min(1)
				.max(product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER)
				.default(1),
			customPriceAmount: z
				.string()
				.regex(/^\d+(\.\d+)?$/)
				.optional(),
			customPriceCurrency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]).optional(),
			deposit: z.enum(['partial', 'full']).optional(),
			chosenVariations: z.record(z.string(), z.string()).optional(),
			time: z.date({ coerce: true }).optional(),
			durationMinutes: z.number({ coerce: true }).int().min(1).optional(),
			bookedDates: z
				.string()
				.optional()
				.transform((val) =>
					val
						? val
								.split(',')
								.map((d) => parseISO(d))
								.filter(isValid)
						: undefined
				)
		})
		.parse(json);

	if (product.bookingSpec && (!time || !durationMinutes)) {
		throw error(400, 'Time and duration are required for booking products');
	}

	const customPrice =
		customPriceAmount && customPriceCurrency
			? {
					amount: parsePriceAmount(customPriceAmount, customPriceCurrency),
					currency: customPriceCurrency
			  }
			: undefined;

	// For PWYW products with VAT-included display: extract VAT from entered price
	if (customPrice && product.payWhatYouWant && runtimeConfig.displayVatIncludedInProduct) {
		const vatProfiles = await collections.vatProfiles.find().toArray();
		const rate = computeVatRate({
			productVatProfileId: product.vatProfileId,
			vatProfiles,
			bebopCountry: runtimeConfig.vatCountry,
			userCountry: locals.countryCode,
			vatSingleCountry: runtimeConfig.vatSingleCountry
		});

		// Extract VAT: entered price is WITH VAT, we need to store WITHOUT VAT
		customPrice.amount = extractVat(customPrice.amount, rate);
	}

	const user = userIdentifier(locals);
	await addToCartInDb(product, quantity, {
		user: user,
		mode: user.userHasPosOptions ? 'pos' : 'eshop',
		...(customPrice && { customPrice }),
		deposit: deposit === 'partial',
		...(product.hasVariations && { chosenVariations }),
		...(time && durationMinutes && product.bookingSpec
			? {
					booking: {
						time,
						durationMinutes: durationMinutes,
						bookedDates
					}
			  }
			: undefined)
	});
}

/**
 * A sale lock is not an error page. Send the customer back to the product page, which
 * recomputes the same verdict on load and states it there, with the CTA already greyed out —
 * the way they would have seen it had they landed on the page a moment later. Everything
 * else keeps bubbling up as it did.
 */
/**
 * A refusal is answered, not redirected.
 *
 * Redirecting looked tidy and was a lie: under `use:enhance` a redirect is not an error, so the
 * page took its success path and announced a product it had not added. `fail` gives the form a
 * typed failure it can state, and leaves the no-JS path on the product page rather than on a
 * bare 400.
 */
async function addToCartOrExplain(params: RequestEvent) {
	try {
		await addToCart(params);
		return null;
	} catch (err) {
		if (!isSaleLockError(err)) {
			throw err;
		}
		const body = (err as { body?: { code?: string; params?: Record<string, string | number> } })
			.body;
		return fail(400, { saleLock: { code: body?.code, params: body?.params ?? {} } });
	}
}

export const actions = {
	buy: async (params) => {
		const refused = await addToCartOrExplain(params);
		if (refused) {
			return refused;
		}

		throw redirect(303, '/checkout');
	},

	addToCart: async (params) => {
		const refused = await addToCartOrExplain(params);
		if (refused) {
			return refused;
		}

		throw redirect(303, params.request.headers.get('referer') || '/cart');
	}
};
