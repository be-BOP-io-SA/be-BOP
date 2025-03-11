import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { MAX_NAME_LIMIT, type Product } from '$lib/types/Product';
import { generateId } from '$lib/utils/generateId';
import { adminPrefix } from '$lib/server/admin';
import { CURRENCIES } from '$lib/types/Currency';

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

		const { name, mode, productIds, currency, beginsAt, endsAt } = z
			.object({
				name: z.string().min(1).max(MAX_NAME_LIMIT),
				productIds: z.string().array(),
				mode: z.enum(['totalProducts', 'moneyAmount']),
				currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]).optional(),
				beginsAt: z.date({ coerce: true }),
				endsAt: z.date({ coerce: true })
			})
			.parse({
				name: data.get('name'),
				productIds: JSON.parse(String(data.get('productIds'))).map(
					(x: { value: string }) => x.value
				),
				mode: data.get('mode'),
				currency: data.get('currency') ?? undefined,
				beginsAt: data.get('beginsAt'),
				endsAt: data.get('endsAt')
			});

		if (mode === 'moneyAmount' && !currency) {
			throw error(400, 'Currency is required');
		}

		const slug = generateId(name, true);

		await collections.leaderboards.insertOne({
			_id: slug,
			name,
			productIds: productIds,
			progress: productIds.map((productId) => ({
				productId: productId,
				amount: 0,
				...(mode === 'moneyAmount' && { currency: currency })
			})),
			beginsAt,
			endsAt,
			createdAt: new Date(),
			updatedAt: new Date(),
			mode
		});

		throw redirect(303, `${adminPrefix()}/leaderboard/${slug}`);
	}
};
