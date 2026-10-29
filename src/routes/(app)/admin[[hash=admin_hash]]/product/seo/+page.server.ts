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
				hideFromSEO: z.boolean({ coerce: true }).default(false),
				productIds: z.string().array().default([])
			})
			.parse({
				hideFromSEO: formData.get('hideFromSEO') ?? false,
				productIds: formData.getAll('productIds')
			});

		if (parsed.productIds.length) {
			await collections.products.updateMany(
				{ _id: { $in: parsed.productIds } },
				{
					$set: {
						hideFromSEO: parsed.hideFromSEO,
						updatedAt: new Date()
					}
				}
			);
		}

		throw redirect(303, request.headers.get('referer') || '/admin/product/seo');
	}
};
