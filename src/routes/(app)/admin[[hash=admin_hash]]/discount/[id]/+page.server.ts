import { adminPrefix } from '$lib/server/admin.js';
import { collections } from '$lib/server/database.js';
import { MAX_NAME_LIMIT, type Product } from '$lib/types/Product.js';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';

export async function load({ params }) {
	const discount = await collections.discounts.findOne({
		_id: params.id
	});

	if (!discount) {
		throw error(404, 'discount not found');
	}

	const beginsAt = discount.beginsAt?.toJSON().slice(0, 10);
	const endsAt = discount.endsAt?.toJSON().slice(0, 10) ?? '';
	const subscriptions = await collections.products
		.find({ type: 'subscription' })
		.project<Pick<Product, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
	const products = await collections.products
		.find({
			type: { $ne: 'subscription' },
			payWhatYouWant: { $exists: true, $eq: false },
			free: { $exists: true, $eq: false }
		})
		.project<Pick<Product, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
	return {
		discount,
		beginsAt,
		endsAt,
		products,
		subscriptions
	};
}

export const actions = {
	update: async function ({ request, params }) {
		const discount = await collections.discounts.findOne({
			_id: params.id
		});

		if (!discount) {
			throw error(404, 'discount not found');
		}
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
			endsAt: z.date({ coerce: true }).nullable()
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
			endsAt: formData.get('endsAt') || null
		});

		const timestamp = { createdAt: new Date(), updatedAt: new Date() };

		if (discount.mode === 'percentage') {
			const parsed = percentageSchema.safeParse({ percentage: formData.get('percentage') });

			if (!parsed.success || parsed.data.percentage < 0 || isNaN(parsed.data.percentage)) {
				throw error(400, 'Invalid or missing percentage');
			}

			const percentageDiscount = {
				...baseData,
				...timestamp,
				percentage: parsed.data.percentage
			};
			await collections.discounts.updateOne(
				{
					_id: discount._id
				},
				{
					$set: percentageDiscount
				}
			);
		}

		if (discount.mode === 'freeProducts') {
			const parsed = freeProductsSchema.safeParse({ quantityPerProduct });

			if (
				!parsed.success ||
				!parsed.data.quantityPerProduct ||
				Object.keys(parsed.data.quantityPerProduct).length === 0
			) {
				throw error(400, 'Invalid or missing quantityPerProduct');
			}

			const freeProductsDiscount = {
				...baseData,
				...timestamp,
				quantityPerProduct: parsed.data.quantityPerProduct
			};

			await collections.discounts.updateOne(
				{
					_id: discount._id
				},
				{
					$set: freeProductsDiscount
				}
			);
		}
	},

	delete: async function ({ params }) {
		await collections.discounts.deleteOne({
			_id: params.id
		});

		throw redirect(303, `${adminPrefix()}/discount`);
	}
};
