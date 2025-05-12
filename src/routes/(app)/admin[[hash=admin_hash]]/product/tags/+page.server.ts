import { collections } from '$lib/server/database';
import type { Product } from '$lib/types/Product';
import type { Tag } from '$lib/types/Tag';
import { set } from '$lib/utils/set';
import { redirect } from '@sveltejs/kit';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

export const load = async () => {
	const products = await collections.products
		.find({})
		.project<Pick<Product, '_id' | 'name' | 'tagIds'>>({
			_id: 1,
			name: 1,
			tagIds: 1
		})
		.toArray();
	const tags = await collections.tags
		.find({})
		.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();

	return {
		products,
		tags
	};
};

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}
		for (const key of Object.keys(json)) {
			const { tagIds } = z
				.object({
					tagIds: z.string().array().optional()
				})
				.parse({
					tagIds: JSON.parse(String(formData.get(`${key}.tagIds`))).map(
						(x: { value: string }) => x.value
					)
				});

			await collections.products.updateOne(
				{ _id: key },
				{
					$set: {
						tagIds: tagIds,
						updatedAt: new Date()
					}
				}
			);
		}
		throw redirect(303, request.headers.get('referer') || '/admin/product/tags');
	}
};
