import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { MAX_NAME_LIMIT, type Product } from '$lib/types/Product';
import { generateId } from '$lib/utils/generateId';
import { adminPrefix } from '$lib/server/admin';
import { isEmpty } from 'lodash-es';

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
		const formData = await request.formData();
		const quantityPerProductRecord: Record<string, number> = {};
		for (const [key, value] of formData.entries()) {
			const match = key.match(/^quantityPerProduct\[(.+?)\]$/);
			if (match) {
				quantityPerProductRecord[match[1]] = Number(value);
			}
		}

		const {
			name,
			percentage,
			subscriptionIds,
			productIds,
			wholeCatalog,
			beginsAt,
			endsAt,
			quantityPerProduct,
			mode
		} = z
			.object({
				name: z.string().min(1).max(MAX_NAME_LIMIT),
				productIds: z.string().array(),
				subscriptionIds: z.string().array().min(1),
				percentage: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.optional(),
				wholeCatalog: z.boolean({ coerce: true }).default(false),
				beginsAt: z.date({ coerce: true }),
				endsAt: z.date({ coerce: true }).optional(),
				quantityPerProduct: z.record(z.string(), z.number().min(0).max(100)).optional(),
				mode: z.enum(['percentage', 'freeProducts'])
			})
			.parse({
				name: formData.get('name'),
				subscriptionIds: JSON.parse(String(formData.get('subscriptionIds'))).map(
					(x: { value: string }) => x.value
				),
				productIds: JSON.parse(String(formData.get('productIds') ?? '[]')).map(
					(x: { value: string }) => x.value
				),
				wholeCatalog: formData.get('wholeCatalog'),
				percentage: formData.get('percentage') || '0',
				beginsAt: formData.get('beginsAt'),
				endsAt: formData.get('endsAt') || undefined,
				quantityPerProduct: quantityPerProductRecord,
				mode: formData.get('mode')
			});

		if (Number(percentage) < 0 || isNaN(Number(percentage))) {
			throw error(400, 'Invalid percentage');
		}

		if (mode === 'percentage' && !percentage) {
			throw error(400, 'percentage is required');
		}

		const slug = generateId(name, true);

		const baseData = {
			_id: slug,
			name,
			productIds: productIds,
			subscriptionIds: subscriptionIds,
			wholeCatalog,
			beginsAt,
			endsAt: endsAt || null,
			createdAt: new Date(),
			updatedAt: new Date()
		} as const;
		if (mode === 'percentage' && percentage) {
			await collections.discounts.insertOne({
				...baseData,
				mode,
				percentage: Number(percentage)
			});
		} else if (mode === 'freeProducts' && !isEmpty(quantityPerProduct)) {
			await collections.discounts.insertOne({
				...baseData,
				mode,
				quantityPerProduct
			});
		}

		throw redirect(303, `${adminPrefix()}/discount/${slug}`);
	}
};
