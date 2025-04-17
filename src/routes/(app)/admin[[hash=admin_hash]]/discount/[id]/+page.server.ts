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
		const quantityPerProductRecord: Record<string, number> = {};
		for (const [key, value] of formData.entries()) {
			const match = key.match(/^quantityPerProduct\[(.+?)\]$/);
			if (match) {
				quantityPerProductRecord[match[1]] = Number(value);
			}
		}
		const {
			name,
			subscriptionIds,
			productIds,
			wholeCatalog,
			percentage,
			beginsAt,
			endsAt,
			quantityPerProduct
		} = z
			.object({
				name: z.string().min(1).max(MAX_NAME_LIMIT),
				productIds: z.string().array().optional(),
				subscriptionIds: z.string().array(),
				percentage: z
					.string()
					.regex(/^\d+(\.\d+)?$/)
					.optional(),
				wholeCatalog: z.boolean({ coerce: true }).default(false),
				beginsAt: z.date({ coerce: true }),
				endsAt: z.date({ coerce: true }).optional(),
				quantityPerProduct: z.record(z.string(), z.number().min(0).max(100)).optional()
			})
			.parse({
				name: formData.get('name'),
				subscriptionIds: JSON.parse(String(formData.get('subscriptionIds'))).map(
					(x: { value: string }) => x.value
				),
				productIds:
					JSON.parse(String(formData.get('productIds') ?? '[]')).map(
						(x: { value: string }) => x.value
					) || undefined,
				wholeCatalog: formData.get('wholeCatalog'),
				percentage: formData.get('percentage') || undefined,
				beginsAt: formData.get('beginsAt'),
				endsAt: formData.get('endsAt') || undefined,
				quantityPerProduct: quantityPerProductRecord || undefined
			});

		await collections.discounts.updateOne(
			{
				_id: discount._id
			},
			{
				$set: {
					name,
					...(percentage && { percentage: Number(percentage) }),
					subscriptionIds,
					wholeCatalog,
					productIds,
					beginsAt,
					endsAt: endsAt || null,
					updatedAt: new Date(),
					quantityPerProduct
				}
			}
		);
	},

	delete: async function ({ params }) {
		await collections.discounts.deleteOne({
			_id: params.id
		});

		throw redirect(303, `${adminPrefix()}/discount`);
	}
};
