import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES, type Currency } from '$lib/types/Currency.js';
import { z } from 'zod';

export async function load() {
	return {
		taler: runtimeConfig.taler
	};
}

export const actions = {
	save: async function ({ request }) {
		const taler = z
			.object({
				backendUrl: z.string().min(1),
				backendApiKey: z.string().min(1),
				currency: z.enum(
					CURRENCIES.filter((c) => c !== 'BTC' && c !== 'SAT') as [Currency, ...Currency[]]
				)
			})
			.parse(Object.fromEntries(await request.formData()));

		await collections.runtimeConfig.updateOne(
			{
				_id: 'taler'
			},
			{
				$set: {
					data: taler,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig.taler = taler;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({
			_id: 'taler'
		});

		runtimeConfig.taler = {
			backendUrl: '',
			backendApiKey: '',
			currency: 'CHF'
		};
	}
};
