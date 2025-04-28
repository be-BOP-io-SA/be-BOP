import { runtimeConfig } from '$lib/server/runtime-config';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';
import { z } from 'zod';
import { collections } from '$lib/server/database';
import { deliveryFeesSchema } from './schema';

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
				allowFreeForPOS: z.boolean({ coerce: true })
			})
			.parse(json);

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
