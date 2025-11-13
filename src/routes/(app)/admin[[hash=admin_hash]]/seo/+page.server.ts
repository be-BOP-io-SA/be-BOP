import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { z } from 'zod';
import { enableTelemetry, disableTelemetry } from '$lib/server/telemetry-helpers';

export async function load() {
	return {
		hideFromSearchEngines: runtimeConfig.hideFromSearchEngines,
		enableBeaconSignal: runtimeConfig.telemetry?.enabled ?? false
	};
}

export const actions = {
	update: async function ({ request }) {
		const formData = await request.formData();

		const result = z
			.object({
				hideFromSearchEngines: z.boolean({ coerce: true }),
				enableBeaconSignal: z.boolean({ coerce: true })
			})
			.parse({
				hideFromSearchEngines: formData.get('hideFromSearchEngines'),
				enableBeaconSignal: formData.get('enableBeaconSignal')
			});

		const now = new Date();

		await collections.runtimeConfig.updateOne(
			{ _id: 'hideFromSearchEngines' },
			{
				$set: { data: result.hideFromSearchEngines, updatedAt: now },
				$setOnInsert: { createdAt: now }
			},
			{ upsert: true }
		);
		runtimeConfig.hideFromSearchEngines = result.hideFromSearchEngines;

		if (result.enableBeaconSignal) {
			await enableTelemetry({ source: 'SEO Config' });
		} else {
			const neverAskAgain = runtimeConfig.telemetry?.nextPrompt === null;
			await disableTelemetry({ neverAskAgain, source: 'SEO Config' });
		}

		return {
			success: 'SEO configuration updated.'
		};
	}
};
