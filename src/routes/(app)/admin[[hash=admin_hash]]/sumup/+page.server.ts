import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';
import { CURRENCIES, type Currency } from '$lib/types/Currency.js';
import { z } from 'zod';

export async function load() {
	return {
		sumUp: runtimeConfig.sumUp
	};
}

export const actions = paymentConfigActions({
	key: 'sumUp',
	processor: 'sumup',
	schema: z.object({
		apiKey: z.string().startsWith('sup_sk_'),
		currency: z.enum(
			CURRENCIES.filter((c) => c !== 'BTC' && c !== 'SAT') as [Currency, ...Currency[]]
		),
		merchantCode: z.string().min(1)
	}),
	empty: { apiKey: '', merchantCode: '', currency: 'EUR' }
});
