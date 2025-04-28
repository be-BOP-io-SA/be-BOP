import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { CURRENCIES } from '$lib/types/Currency.js';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const confirmationThresholds = z
			.object({
				currency: z.enum([CURRENCIES[0], ...CURRENCIES.slice(1)]),
				defaultBlocks: z.number({ coerce: true }).int().min(0),
				thresholds: z.array(
					z.object({
						minAmount: z.number({ coerce: true }).min(0),
						maxAmount: z.number({ coerce: true }).min(0),
						confirmationBlocks: z.number({ coerce: true }).int().min(0)
					})
				)
			})
			.parse(json);

		confirmationThresholds.thresholds.sort((a, b) => a.minAmount - b.minAmount);

		await collections.runtimeConfig.updateOne(
			{ _id: 'confirmationBlocksThresholds' },
			{
				$set: {
					data: confirmationThresholds,
					updatedAt: new Date()
				},
				$setOnInsert: {
					createdAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig.confirmationBlocksThresholds = confirmationThresholds;
	}
};
