import { collections } from '$lib/server/database';
import { z } from 'zod';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';
import { CURRENCIES, parsePriceAmount } from '$lib/types/Currency';

export const load = async () => {
	const products = await collections.products.find({}).toArray();

	return {
		products: products.map((p) => ({
			name: p.name,
			price: p.price,
			_id: p._id
		}))
	};
};

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		for (const [key, value] of Object.entries(json)) {
			const { price, currency } = z
				.object({
					price: z.string().regex(/^\d+(\.\d+)?$/),
					currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)])
				})
				.parse(value);

			const priceAmount = parsePriceAmount(price, currency);

			await collections.products.updateOne(
				{ _id: key },
				{
					$set: {
						price: {
							amount: priceAmount,
							currency
						},
						updatedAt: new Date()
					}
				}
			);
		}
	}
};
