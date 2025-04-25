import { collections } from '$lib/server/database';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';
import { set } from '$lib/utils/set';
import type { Actions } from './$types';
import { runtimeConfig } from '$lib/server/runtime-config';
import { pojo } from '$lib/server/pojo';
import { type Product, PRODUCT_PAGINATION_LIMIT } from '$lib/types/Product';
import { picturesForProducts } from '$lib/server/picture';
import type { Filter } from 'mongodb';
import { escapeForRegex } from '$lib/utils/escapeForRegex';

export const load = async ({ url }) => {
	const querySchema = z.object({
		skip: z.number({ coerce: true }).int().min(0).optional().default(0),
		productId: z.string().optional(),
		productName: z.string().optional(),
		productType: z.enum(['' as const, ...['resource', 'donation', 'subscription']]).optional(),
		productAttribute: z
			.enum([
				'' as const,
				...['shipping', 'standalone', 'payWhatYouWant', 'free', 'isTicket', 'preorder']
			])
			.optional(),
		stock: z.enum(['' as const, ...['no-stock-management', 'with-stock', 'no-stock']]).optional()
	});
	const searchParams = Object.fromEntries(url.searchParams.entries());
	const result = querySchema.parse(searchParams);
	const { skip, productId, productName, productType, productAttribute, stock } = result;

	const query: Filter<Product> = {};

	if (productId) {
		query._id = productId;
	}

	if (productName) {
		query.name = { $regex: escapeForRegex(productName), $options: 'i' };
	}

	if (productType) {
		query.type = productType as 'resource' | 'donation' | 'subscription';
	}

	if (productAttribute) {
		query[productAttribute] = true;
	}

	if (stock) {
		switch (stock) {
			case 'no-stock-management':
				query.stock = { $exists: false };
				break;
			case 'with-stock':
				query['stock.available'] = { $gt: 0 };
				break;
			case 'no-stock':
				query['stock.available'] = { $lte: 0 };
				break;
		}
	}

	const products = await collections.products
		.find(query)
		.skip(skip)
		.limit(PRODUCT_PAGINATION_LIMIT)
		.sort({ updatedAt: -1 })
		.toArray();
	const productIds = products.map((product) => product._id);

	return {
		products: products.map((product) => pojo(product)),
		pictures: await picturesForProducts(productIds)
	};
};

export const actions: Actions = {
	update: async ({ request }) => {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const {
			eshopVisible,
			retailVisible,
			googleShoppingVisible,
			nostrVisible,
			eshopBasket,
			retailBasket,
			nostrBasket
		} = z
			.object({
				eshopVisible: z.boolean({ coerce: true }).default(false),
				retailVisible: z.boolean({ coerce: true }).default(false),
				googleShoppingVisible: z.boolean({ coerce: true }).default(false),
				nostrVisible: z.boolean({ coerce: true }).default(false),
				eshopBasket: z.boolean({ coerce: true }).default(false),
				retailBasket: z.boolean({ coerce: true }).default(false),
				nostrBasket: z.boolean({ coerce: true }).default(false)
			})
			.parse({
				...json
			});

		await collections.runtimeConfig.updateOne(
			{
				_id: 'productActionSettings'
			},
			{
				$set: {
					data: {
						eShop: {
							visible: eshopVisible,
							canBeAddedToBasket: eshopBasket
						},
						retail: {
							visible: retailVisible,
							canBeAddedToBasket: retailBasket
						},
						googleShopping: {
							visible: googleShoppingVisible
						},
						nostr: {
							visible: nostrVisible,
							canBeAddedToBasket: nostrBasket
						}
					},
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig.productActionSettings = {
			eShop: {
				visible: eshopVisible,
				canBeAddedToBasket: eshopBasket
			},
			retail: {
				visible: retailVisible,
				canBeAddedToBasket: retailBasket
			},
			googleShopping: {
				visible: googleShoppingVisible
			},
			nostr: {
				visible: nostrVisible,
				canBeAddedToBasket: nostrBasket
			}
		};

		return {};
	}
};
