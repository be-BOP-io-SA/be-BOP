import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES, type Currency } from '$lib/types/Currency.js';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	return {
		sumUp: runtimeConfig.sumUp
	};
};

export const actions: Actions = {
	save: async function ({ request }) {
		const sumup = z
			.object({
				apiKey: z.string().startsWith('sup_sk_'),
				currency: z.enum(
					CURRENCIES.filter((c) => c !== 'BTC' && c !== 'SAT') as [Currency, ...Currency[]]
				),
				merchantCode: z.string().min(1)
			})
			.parse(Object.fromEntries(await request.formData()));

		await collections.runtimeConfig.updateOne(
			{
				_id: 'sumUp'
			},
			{
				$set: {
					data: sumup,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig.sumUp = sumup;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({
			_id: 'sumUp'
		});

		runtimeConfig.sumUp = {
			apiKey: '',
			merchantCode: '',
			currency: 'EUR'
		};
	}
};
