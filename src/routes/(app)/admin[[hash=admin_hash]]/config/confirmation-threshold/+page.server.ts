import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { CURRENCIES } from '$lib/types/Currency.js';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

/** Each chain keeps its own grid: a Zcash block comes every 75 seconds, a bitcoin one every ten minutes. */
const GRID_KEYS = {
	bitcoin: 'confirmationBlocksThresholds',
	zcash: 'zcashConfirmationBlocksThresholds'
} as const;

export function load() {
	// The bitcoin grid already comes with every page, from the layout.
	return { zcashConfirmationBlocksThresholds: runtimeConfig.zcashConfirmationBlocksThresholds };
}

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();
		const key = GRID_KEYS[z.enum(['bitcoin', 'zcash']).parse(formData.get('grid') ?? 'bitcoin')];

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
			{ _id: key },
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

		runtimeConfig[key] = confirmationThresholds;
	}
};
