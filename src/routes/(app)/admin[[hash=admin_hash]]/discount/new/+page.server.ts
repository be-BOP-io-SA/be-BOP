import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { MAX_NAME_LIMIT, type Product } from '$lib/types/Product';
import { generateId } from '$lib/utils/generateId';
import { adminPrefix } from '$lib/server/admin';

export const load = async () => {
	const subscriptions = await collections.products
		.find({ type: 'subscription' })
		.project<Pick<Product, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();

	const products = await collections.products
		.find({
			type: { $ne: 'subscription' },
			payWhatYouWant: { $ne: true },
			free: { $ne: true }
		})
		.project<Pick<Product, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();

	return {
		products,
		subscriptions
	};
};

export const actions: Actions = {
	default: async function ({ request }) {
		const data = await request.formData();

		const { name, percentage, subscriptionIds, productIds, wholeCatalog, beginsAt, endsAt } = z
			.object({
				name: z.string().min(1).max(MAX_NAME_LIMIT),
				productIds: z.string().array(),
				subscriptionIds: z.string().array().min(1),
				percentage: z.string().regex(/^\d+(\.\d+)?$/),
				wholeCatalog: z.boolean({ coerce: true }).default(false),
				beginsAt: z.date({ coerce: true }),
				endsAt: z.date({ coerce: true }).optional()
			})
			.parse({
				name: data.get('name'),
				subscriptionIds: JSON.parse(String(data.get('subscriptionIds'))).map(
					(x: { value: string }) => x.value
				),
				productIds: JSON.parse(String(data.get('productIds') ?? '[]')).map(
					(x: { value: string }) => x.value
				),
				wholeCatalog: data.get('wholeCatalog'),
				percentage: data.get('percentage'),
				beginsAt: data.get('beginsAt'),
				endsAt: data.get('endsAt') || undefined
			});

		const slug = generateId(name, true);
		await collections.discounts.insertOne({
			_id: slug,
			name,
			productIds: productIds,
			subscriptionIds: subscriptionIds,
			wholeCatalog,
			percentage: Number(percentage),
			beginsAt,
			endsAt: endsAt || null,
			createdAt: new Date(),
			updatedAt: new Date()
		});

		throw redirect(303, `${adminPrefix()}/discount/${slug}`);
	}
};
