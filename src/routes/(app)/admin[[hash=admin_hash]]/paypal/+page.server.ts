import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES, type Currency } from '$lib/types/Currency.js';
import { z } from 'zod';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		paypal: runtimeConfig.paypal
	};
};

export const actions: Actions = {
	save: async function ({ request }) {
		const paypal = z
			.object({
				clientId: z.string().min(1),
				secret: z.string().min(1),
				sandbox: z.boolean({ coerce: true }),
				currency: z.enum(
					CURRENCIES.filter((c) => c !== 'BTC' && c !== 'SAT') as [Currency, ...Currency[]]
				)
			})
			.parse(Object.fromEntries(await request.formData()));

		await collections.runtimeConfig.updateOne(
			{
				_id: 'paypal'
			},
			{
				$set: {
					data: paypal,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig.paypal = paypal;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({
			_id: 'paypal'
		});

		runtimeConfig.paypal = {
			clientId: '',
			secret: '',
			currency: 'EUR',
			sandbox: false
		};
	}
};
