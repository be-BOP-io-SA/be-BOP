import { collections } from '$lib/server/database';
import type { Product } from '$lib/types/Product';
import { redirect } from '@sveltejs/kit';
import { z } from 'zod';

export const load = async () => {
	const products = await collections.products
		.find({})
		.project<Pick<Product, '_id' | 'name'>>({ _id: 1, name: 1 })
		.sort({ updatedAt: -1 })
		.toArray();

	return {
		products
	};
};

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const parsed = z
			.object({
				eshopVisible: z.boolean({ coerce: true }).default(false),
				retailVisible: z.boolean({ coerce: true }).default(false),
				googleShoppingVisible: z.boolean({ coerce: true }).default(false),
				nostrVisible: z.boolean({ coerce: true }).default(false),
				eshopBasket: z.boolean({ coerce: true }).default(false),
				retailBasket: z.boolean({ coerce: true }).default(false),
				nostrBasket: z.boolean({ coerce: true }).default(false),
				productIds: z.string().array().default([])
			})
			.parse({
				eshopVisible: formData.get('eshopVisible') ?? false,
				retailVisible: formData.get('retailVisible') ?? false,
				googleShoppingVisible: formData.get('googleShoppingVisible') ?? false,
				nostrVisible: formData.get('nostrVisible') ?? false,
				eshopBasket: formData.get('eshopBasket') ?? false,
				retailBasket: formData.get('retailBasket') ?? false,
				nostrBasket: formData.get('nostrBasket') ?? false,
				productIds: formData.getAll('productIds')
			});

		if (parsed.productIds.length) {
			await collections.products.updateMany(
				{ _id: { $in: parsed.productIds } },
				{
					$set: {
						actionSettings: {
							eShop: {
								visible: parsed.eshopVisible,
								canBeAddedToBasket: parsed.eshopBasket
							},
							retail: {
								visible: parsed.retailVisible,
								canBeAddedToBasket: parsed.retailBasket
							},
							googleShopping: {
								visible: parsed.googleShoppingVisible
							},
							nostr: {
								visible: parsed.nostrVisible,
								canBeAddedToBasket: parsed.nostrBasket
							}
						},
						updatedAt: new Date()
					}
				}
			);
		}

		throw redirect(303, request.headers.get('referer') || '/admin/product/action-settings');
	}
};
