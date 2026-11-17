import { runtimeConfig } from '$lib/server/runtime-config';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';
import { z } from 'zod';
import { collections } from '$lib/server/database';
import { deliveryFeesSchema } from './schema';
import { zodObjectId } from '$lib/server/zod';
import { DELIVERY_FEES_VAT_MODES } from '$lib/cart';
import { error } from '@sveltejs/kit';

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const deliveryFees = z
			.object({
				mode: z.enum(['flatFee', 'perItem']),
				onlyPayHighest: z.boolean({ coerce: true }),
				applyFlatFeeToEachItem: z.boolean({ coerce: true }),
				deliveryFees: deliveryFeesSchema.default({}),
				allowFreeForPOS: z.boolean({ coerce: true }),
				vatIncludedReference: z.boolean({ coerce: true }).default(false),
				vatMode: z.enum(DELIVERY_FEES_VAT_MODES).default('standard'),
				vatProfileId: zodObjectId()
					.or(z.literal(''))
					.optional()
					.transform((s) => s || null)
			})
			.parse(json);

		// The profile only means something in custom mode; elsewhere a stale one would be misread.
		if (deliveryFees.vatMode !== 'custom') {
			deliveryFees.vatProfileId = null;
		} else if (!deliveryFees.vatProfileId) {
			throw error(400, 'Choose the VAT profile to apply to delivery fees');
		}

		await collections.runtimeConfig.updateOne(
			{
				_id: 'deliveryFees'
			},
			{
				$set: {
					data: deliveryFees,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig.deliveryFees = deliveryFees;

		return {
			success: true
		};
	}
};
