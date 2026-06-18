import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES, type Currency } from '$lib/types/Currency.js';
import { z } from 'zod';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	return {
		stripe: runtimeConfig.stripe
	};
};

export const actions: Actions = {
	save: async function ({ request }) {
		const stripe = z
			.object({
				publicKey: z.string().startsWith('pk_'),
				secretKey: z.string().startsWith('sk_'),
				currency: z.enum(
					CURRENCIES.filter((c) => c !== 'BTC' && c !== 'SAT') as [Currency, ...Currency[]]
				)
			})
			.parse(Object.fromEntries(await request.formData()));

		await collections.runtimeConfig.updateOne(
			{
				_id: 'stripe'
			},
			{
				$set: {
					data: stripe,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig.stripe = stripe;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({
			_id: 'stripe'
		});

		runtimeConfig.stripe = {
			secretKey: '',
			publicKey: '',
			currency: 'EUR'
		};
	}
};
