import { addToCartInDb } from '$lib/server/cart';
import { cmsFromContent } from '$lib/server/cms';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { userIdentifier, userQuery } from '$lib/server/user';
import { CURRENCIES, parsePriceAmount } from '$lib/types/Currency';
import { DEFAULT_MAX_QUANTITY_PER_ORDER, type Product } from '$lib/types/Product';
import { productToScheduleId, type ScheduleEvent } from '$lib/types/Schedule';
import { set } from '$lib/utils/set';
import { sum } from '$lib/utils/sum';
import { UserIdentifier } from '$lib/types/UserIdentifier';
import type { RequestEvent } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { subDays } from 'date-fns';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

async function fetchApplicableDiscount(productId: string, userSubscriptionIds: string[]) {
	return collections.discounts.findOne(
		{
			$or: [{ wholeCatalog: true }, { productIds: productId }],
			subscriptionIds: { $in: userSubscriptionIds },
			beginsAt: {
				$lt: new Date()
			},
			mode: 'percentage',
			$and: [
				{
					$or: [
						{
							endsAt: { $gt: new Date() }
						},
						{
							endsAt: null
						}
					]
				}
			]
		},
		{
			sort: { percentage: -1 }
		}
	);
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
				vatProfileId: 1
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
			...userQuery(userIdentifier),
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
	const discount = userSubscriptions.length
		? await fetchApplicableDiscount(
				productId,
				userSubscriptions.map((sub) => sub.productId)
		  )
		: null;
	return {
		product: { ...product, vatProfileId: product.vatProfileId?.toString() },
		pictures,
		discount,
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
		showCheckoutButton: runtimeConfig.checkoutButtonOnProductPage,
		websiteShortDescription: product.shortDescription,
		freeProductsAvailable
	};
};

async function addToCart({ params, request, locals }: RequestEvent) {
	const product = await collections.products.findOne({
		alias: params.id
	});

	if (!product) {
		throw error(404, 'Product not found');
	}

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
		durationMinutes
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
			durationMinutes: z.number({ coerce: true }).int().min(1).optional()
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
	await addToCartInDb(product, quantity, {
		user: userIdentifier(locals),
		mode: 'eshop',
		...(customPrice && { customPrice }),
		deposit: deposit === 'partial',
		...(product.hasVariations && { chosenVariations }),
		...(time && durationMinutes && product.bookingSpec
			? {
					booking: {
						time,
						durationMinutes: durationMinutes
					}
			  }
			: undefined)
	});
}

export const actions = {
	buy: async (params) => {
		await addToCart(params);

		throw redirect(303, '/checkout');
	},

	addToCart: async (params) => {
		await addToCart(params);

		throw redirect(303, params.request.headers.get('referer') || '/cart');
	}
};
