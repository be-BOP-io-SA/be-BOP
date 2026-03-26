import { collections } from '$lib/server/database';
import { z } from 'zod';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';
import { CURRENCIES, parsePriceAmount } from '$lib/types/Currency';
import { logAccountingEvent, employeeFromLocals } from '$lib/server/accounting-log';

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
	default: async function ({ request, locals }) {
		const formData = await request.formData();

		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const entries = Object.entries(json).map(([key, value]) => {
			const { price, currency } = z
				.object({
					price: z.string().regex(/^\d+(\.\d+)?$/),
					currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)])
				})
				.parse(value);
			return { key, priceAmount: parsePriceAmount(price, currency), currency };
		});

		const productIds = entries.map((e) => e.key);
		const existingProducts = await collections.products
			.find({ _id: { $in: productIds } })
			.toArray();
		const existingMap = new Map(existingProducts.map((p) => [p._id, p]));

		for (const { key, priceAmount, currency } of entries) {
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

			const existing = existingMap.get(key);
			if (
				existing &&
				(existing.price.amount !== priceAmount || existing.price.currency !== currency)
			) {
				await logAccountingEvent({
					eventType: 'productPriceUpdate',
					before: existing.price,
					after: { amount: priceAmount, currency },
					objectId: key,
					objectType: 'product',
					...employeeFromLocals(locals)
				});
			}
		}
	}
};
