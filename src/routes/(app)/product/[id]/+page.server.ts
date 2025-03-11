import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { DEFAULT_MAX_QUANTITY_PER_ORDER, type Product } from '$lib/types/Product';
import { z } from 'zod';
import { runtimeConfig } from '$lib/server/runtime-config';
import { addToCartInDb } from '$lib/server/cart';
import { CURRENCIES, parsePriceAmount } from '$lib/types/Currency';
import { userIdentifier, userQuery } from '$lib/server/user';
import { POS_ROLE_ID } from '$lib/types/User';
import { cmsFromContent } from '$lib/server/cms';
import type { JsonObject } from 'type-fest';
import { set } from 'lodash-es';

export const load = async ({ params, locals }) => {
	const product = await collections.products.findOne<
		Pick<
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
			| 'mobile'
			| 'hasVariations'
			| 'variations'
			| 'variationLabels'
			| 'sellDisclaimer'
			| 'hasSellDisclaimer'
			| 'hideFromSEO'
		>
	>(
		{ _id: params.id },
		{
			projection: {
				_id: 1,
				name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] },
				price: 1,
				shortDescription: {
					$ifNull: [`$translations.${locals.language}.shortDescription`, '$shortDescription']
				},
				description: { $ifNull: [`$translations.${locals.language}.description`, '$description'] },
				availableDate: 1,
				preorder: 1,
				customPreorderText: {
					$ifNull: [`$translations.${locals.language}.customPreorderText`, '$customPreorderText']
				},
				type: 1,
				displayShortDescription: 1,
				payWhatYouWant: 1,
				standalone: 1,
				maxQuantityPerOrder: 1,
				stock: 1,
				actionSettings: 1,
				contentBefore: {
					$ifNull: [`$translations.${locals.language}.contentBefore`, '$contentBefore']
				},
				contentAfter: {
					$ifNull: [`$translations.${locals.language}.contentAfter`, '$contentAfter']
				},
				deposit: 1,
				cta: { $ifNull: [`$translations.${locals.language}.cta`, '$cta'] },
				hasVariations: 1,
				variationLabels: {
					$ifNull: [`$translations.${locals.language}.variationLabels`, '$variationLabels']
				},
				variations: 1,
				maximumPrice: 1,
				mobile: 1,
				sellDisclaimer: {
					$ifNull: [`$translations.${locals.language}.sellDisclaimer`, '$sellDisclaimer']
				},
				hasSellDisclaimer: 1,
				hideFromSEO: 1
			}
		}
	);

	if (!product) {
		throw error(404, 'Page not found');
	}

	if (
		locals.user?.roleId === POS_ROLE_ID
			? !product.actionSettings.retail.visible
			: !product.actionSettings.eShop.visible
	) {
		throw redirect(303, '/');
	}

	const pictures = await collections.pictures
		.find({ productId: params.id })
		.sort({ createdAt: 1 })
		.toArray();
	const subscriptions = await collections.paidSubscriptions
		.find({
			...userQuery(userIdentifier(locals)),
			productId: product._id,
			paidUntil: { $gt: new Date() }
		})
		.toArray();
	const discount = await collections.discounts.findOne(
		{
			$or: [{ wholeCatalog: true }, { productIds: product._id }],
			subscriptionIds: { $in: subscriptions.map((sub) => sub.productId) },
			endsAt: { $gt: new Date() }
		},
		{
			sort: { percentage: -1 }
		}
	);

	return {
		product,
		pictures,
		discount,
		...(product.contentBefore && {
			productCMSBefore: cmsFromContent({ content: product.contentBefore }, locals)
		}),
		...(product.contentAfter && {
			productCMSAfter: cmsFromContent({ content: product.contentAfter }, locals)
		}),
		showCheckoutButton: runtimeConfig.checkoutButtonOnProductPage,
		websiteShortDescription: product.shortDescription
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

	const { quantity, customPriceAmount, customPriceCurrency, deposit, chosenVariations } = z
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
			chosenVariations: z.record(z.string(), z.string()).optional()
		})
		.parse(json);

	const customPrice =
		customPriceAmount && customPriceCurrency
			? {
					amount: parsePriceAmount(customPriceAmount, customPriceCurrency),
					currency: customPriceCurrency
			  }
			: undefined;
	await addToCartInDb(product, quantity, {
		user: userIdentifier(locals),
		...(customPrice && { customPrice }),
		deposit: deposit === 'partial',
		...(product.hasVariations && { chosenVariations })
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
