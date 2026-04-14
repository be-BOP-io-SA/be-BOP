import { adminPrefix } from '$lib/server/admin.js';
import { collections } from '$lib/server/database.js';
import { MAX_NAME_LIMIT, type Product } from '$lib/types/Product.js';
import type { Tag } from '$lib/types/Tag';
import { COUNTRY_ALPHA2S, type CountryAlpha2 } from '$lib/types/Country';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { parseDiscountConditionFields } from '$lib/server/discount';
import type { UpdateFilter } from 'mongodb';
import type { Discount } from '$lib/types/Discount';

export async function load({ params }) {
	const discount = await collections.discounts.findOne({
		_id: params.id
	});

	if (!discount) {
		throw error(404, 'discount not found');
	}

	const beginsAt = discount.beginsAt?.toJSON().slice(0, 16);
	const endsAt = discount.endsAt?.toJSON().slice(0, 16) ?? '';
	const [subscriptions, products, tags] = await Promise.all([
		collections.products
			.find({ type: 'subscription' })
			.project<Pick<Product, '_id' | 'name'>>({ _id: 1, name: 1 })
			.toArray(),
		collections.products
			.find({
				type: { $ne: 'subscription' },
				payWhatYouWant: { $exists: true, $eq: false },
				free: { $exists: true, $eq: false }
			})
			.project<Pick<Product, '_id' | 'name'>>({ _id: 1, name: 1 })
			.toArray(),
		collections.tags
			.find({ productTagging: true })
			.project<Pick<Tag, '_id' | 'name'>>({ _id: 1, name: 1 })
			.toArray()
	]);
	return {
		discount,
		beginsAt,
		endsAt,
		products,
		subscriptions,
		tags,
		countries: [...COUNTRY_ALPHA2S] as CountryAlpha2[]
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

		const quantityPerProduct: Record<string, number> = Object.fromEntries(
			[...formData.entries()].flatMap(([key, value]) => {
				const match = key.match(/^quantityPerProduct\[(.+?)\]$/);
				return match ? [[match[1], Number(value)]] : [];
			})
		);

		const base = z.object({
			name: z.string().min(1).max(MAX_NAME_LIMIT),
			subscriptionIds: z.string().array(), // was .min(1), now optional
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
			subscriptionIds: JSON.parse(String(formData.get('subscriptionIds') ?? '[]')).map(
				(x: { value: string }) => x.value
			),
			productIds: JSON.parse(String(formData.get('productIds') ?? '[]')).map(
				(x: { value: string }) => x.value
			),
			wholeCatalog: formData.get('wholeCatalog'),
			beginsAt: formData.get('beginsAt'),
			endsAt: formData.get('endsAt') || null
		});

		// Parse condition fields (validates payment methods, country, channels)
		const conditionFields =
			discount.mode === 'percentage' ? parseDiscountConditionFields(formData) : null;

		// Build $unset for fields the admin cleared (so DB reflects current form state)
		const OPTIONAL_CONDITION_KEYS = [
			'promoCode',
			'channels',
			'paymentMethods',
			'deliveryCountry',
			'billingCountry',
			'contactAddresses',
			'requiredTagIds',
			'productCombinations'
		] as const;
		const conditionFieldsToUnset: Partial<Record<(typeof OPTIONAL_CONDITION_KEYS)[number], ''>> =
			conditionFields
				? Object.fromEntries(
						OPTIONAL_CONDITION_KEYS.filter((key) => conditionFields[key] === undefined).map(
							(key) => [key, '']
						)
				  )
				: {};

		const timestamp = { createdAt: new Date(), updatedAt: new Date() };

		if (discount.mode === 'percentage') {
			const parsed = percentageSchema.safeParse({ percentage: formData.get('percentage') });

			if (!parsed.success || parsed.data.percentage < 0 || isNaN(parsed.data.percentage)) {
				throw error(400, 'Invalid or missing percentage');
			}

			const update: UpdateFilter<Discount> = {
				$set: {
					...baseData,
					...conditionFields,
					...timestamp,
					percentage: parsed.data.percentage
				}
			};
			if (Object.keys(conditionFieldsToUnset).length > 0) {
				update.$unset = conditionFieldsToUnset;
			}
			await collections.discounts.updateOne({ _id: discount._id }, update);
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

	updateSubscriptionsWithMissingDiscounts: async function ({ params }) {
		const discount = await collections.discounts.findOne({
			_id: params.id
		});
		if (!discount) {
			throw error(404, 'discount not found');
		}
		if (discount.mode !== 'freeProducts') {
			return;
		}
		const subscriptionsToUpdate = await collections.paidSubscriptions
			.find({
				paidUntil: { $gt: new Date() },
				productId: { $in: discount.subscriptionIds },
				cancelledAt: { $exists: false }
			})
			.toArray();
		const newFreeProducts = Object.entries(discount.quantityPerProduct).map(
			([productId, quantity]) =>
				[productId, { total: quantity, available: quantity, used: 0 }] as const
		);
		await Promise.all(
			(discount.subscriptionIds ?? [])
				.map((subscriptionId) =>
					subscriptionsToUpdate.find((sub) => sub.productId === subscriptionId)
				)
				.filter((sub): sub is NonNullable<typeof sub> => sub !== undefined)
				.map(async (toUpdate) => {
					const existingFreeProducts = toUpdate.freeProductsById ?? {};
					const merged = {
						...existingFreeProducts,
						...Object.fromEntries(
							newFreeProducts.filter(([productId]) => !existingFreeProducts[productId])
						)
					};
					await collections.paidSubscriptions.updateOne(
						{ _id: toUpdate._id },
						{
							$set: {
								updatedAt: new Date(),
								...(Object.keys(merged).length !== 0 && { freeProductsById: merged })
							}
						}
					);
				})
		);
	},

	delete: async function ({ params }) {
		await collections.discounts.deleteOne({
			_id: params.id
		});

		throw redirect(303, `${adminPrefix()}/discount`);
	}
};
