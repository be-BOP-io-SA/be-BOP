import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { MAX_NAME_LIMIT, type Product } from '$lib/types/Product';
import { generateId } from '$lib/utils/generateId';
import { adminPrefix } from '$lib/server/admin';
import { CURRENCIES, parsePriceAmount } from '$lib/types/Currency';

export const load = async () => {
	const products = await collections.products
		.find({})
		.project<Pick<Product, 'name' | '_id'>>({ name: 1 })
		.toArray();

	return {
		products
	};
};

export const actions: Actions = {
	default: async function ({ request }) {
		const data = await request.formData();

		const { name, goalAmount, mode, ratio, globalRatio, productIds, currency, beginsAt, endsAt } = z
			.object({
				name: z.string().min(1).max(MAX_NAME_LIMIT),
				productIds: z.string().array(),
				goalAmount: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.default('0'),
				mode: z.enum(['totalProducts', 'moneyAmount']),
				ratio: z.enum(['total', 'global', 'perProduct']).optional(),
				globalRatio: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.default('0'),
				currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]).optional(),
				beginsAt: z.date({ coerce: true }),
				endsAt: z.date({ coerce: true })
			})
			.parse({
				name: data.get('name'),
				productIds: JSON.parse(String(data.get('productIds'))).map(
					(x: { value: string }) => x.value
				),
				goalAmount: data.get('goalAmount'),
				mode: data.get('mode'),
				currency: data.get('currency') ?? undefined,
				ratio: data.get('ratio') ?? undefined,
				globalRatio: data.get('globalRatio') ?? undefined,
				beginsAt: data.get('beginsAt'),
				endsAt: data.get('endsAt')
			});

		const amount =
			currency && mode === 'moneyAmount'
				? parsePriceAmount(goalAmount, currency)
				: parseInt(goalAmount);

		if (amount < 0 || isNaN(amount)) {
			throw error(400, 'Invalid amount');
		}

		if (mode === 'moneyAmount' && !currency) {
			throw error(400, 'Currency is required');
		}

		const slug = generateId(name, true);

		const baseData = {
			_id: slug,
			name,
			productIds: productIds,
			progress: 0,
			beginsAt,
			endsAt,
			recurring: false,
			createdAt: new Date(),
			updatedAt: new Date()
		} as const;

		if (mode === 'moneyAmount' && currency) {
			await collections.challenges.insertOne({
				...baseData,
				mode,
				goal: {
					amount,
					currency
				},
				ratio,
				...(ratio === 'global' && { globalRatio: parseInt(globalRatio) })
			});
		} else if (mode === 'totalProducts') {
			await collections.challenges.insertOne({
				...baseData,
				mode,
				goal: {
					amount
				}
			});
		} else {
			// This should never happen
			throw error(400, 'Invalid mode');
		}

		throw redirect(303, `${adminPrefix()}/challenge/${slug}`);
	}
};
