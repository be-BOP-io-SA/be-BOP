import { collections } from '$lib/server/database';
import { z } from 'zod';
import type { JsonObject } from 'type-fest';
import { set } from 'lodash-es';
import { MAX_NAME_LIMIT, type Product } from '$lib/types/Product';
import { error } from '@sveltejs/kit';

export const load = async () => {
	const products = await collections.products
		.find({})
		.project<Pick<Product, '_id' | 'name' | 'alias'>>({ _id: 1, name: 1, alias: 1 })
		.toArray();

	return {
		products
	};
};

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}
		const result = Object.values(json)
			.flatMap((val) => val)
			.filter(
				(item): item is { alias: string } =>
					typeof item === 'object' && item !== null && 'alias' in item
			)
			.map((item) => item.alias)
			.filter((alias) => alias !== '');
		const uniqueSet = new Set(result);
		if (uniqueSet.size !== result.length) {
			throw error(400, 'Duplicate alias was found');
		}
		for (const [key, value] of Object.entries(json)) {
			const { alias } = z
				.object({
					alias: z.string().trim().max(MAX_NAME_LIMIT).optional()
				})
				.parse(value);

			await collections.products.updateOne(
				{ _id: key },
				{
					$set: {
						alias: alias ? [key, alias] : [key],
						updatedAt: new Date()
					}
				}
			);
		}
	}
};
