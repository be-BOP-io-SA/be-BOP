import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { MAX_NAME_LIMIT, type Product } from '$lib/types/Product';
import { generateId } from '$lib/utils/generateId';
import { adminPrefix } from '$lib/server/admin';
import type { Discount } from '$lib/types/Discount';

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

		const quantityPerProduct: Record<string, number> = {};
		for (const [key, value] of formData.entries()) {
			const match = key.match(/^quantityPerProduct\[(.+?)\]$/);
			if (match) {
				quantityPerProduct[match[1]] = Number(value);
			}
		}

		const base = z.object({
			name: z.string().min(1).max(MAX_NAME_LIMIT),
			subscriptionIds: z.string().array().min(1),
			productIds: z.string().array(),
			wholeCatalog: z.boolean({ coerce: true }).default(false),
			beginsAt: z.date({ coerce: true }),
			endsAt: z.date({ coerce: true }).nullable(),
			mode: z.enum(['percentage', 'freeProducts'])
		});

		const percentageSchema = z.object({
			percentage: z
				.string()
				.regex(/^\d+(\.\d+)?$/)
				.transform((val) => Number(val))
		});

		const freeProductsSchema = z.object({
			quantityPerProduct: z.record(z.string(), z.number().min(0).max(100)).optional()
		});

		const baseData = base.parse({
			name: formData.get('name'),
			subscriptionIds: JSON.parse(String(formData.get('subscriptionIds'))).map(
				(x: { value: string }) => x.value
			),
			productIds: JSON.parse(String(formData.get('productIds') ?? '[]')).map(
				(x: { value: string }) => x.value
			),
			wholeCatalog: formData.get('wholeCatalog'),
			beginsAt: formData.get('beginsAt'),
			endsAt: formData.get('endsAt') || null,
			mode: formData.get('mode')
		});

		const slug = generateId(baseData.name, true);
		const timestamp = { createdAt: new Date(), updatedAt: new Date() };

		if (baseData.mode === 'percentage') {
			const parsed = percentageSchema.safeParse({ percentage: formData.get('percentage') });

			if (!parsed.success || parsed.data.percentage < 0 || isNaN(parsed.data.percentage)) {
				throw error(400, 'Invalid or missing percentage');
			}

			const percentageDiscount: Extract<Discount, { mode: 'percentage' }> = {
				_id: slug,
				...baseData,
				...timestamp,
				mode: 'percentage',
				percentage: parsed.data.percentage
			};

			await collections.discounts.insertOne(percentageDiscount);
		}

		if (baseData.mode === 'freeProducts') {
			const parsed = freeProductsSchema.safeParse({ quantityPerProduct });

			if (
				!parsed.success ||
				!parsed.data.quantityPerProduct ||
				Object.keys(parsed.data.quantityPerProduct).length === 0
			) {
				throw error(400, 'Invalid or missing quantityPerProduct');
			}

			const freeProductsDiscount: Extract<Discount, { mode: 'freeProducts' }> = {
				_id: slug,
				...baseData,
				...timestamp,
				mode: 'freeProducts',
				quantityPerProduct: parsed.data.quantityPerProduct
			};

			await collections.discounts.insertOne(freeProductsDiscount);
		}

		throw redirect(303, `${adminPrefix()}/discount/${slug}`);
	}
};
