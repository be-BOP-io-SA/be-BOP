import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';
import { CURRENCIES, type Currency } from '$lib/types/Currency.js';
import { z } from 'zod';

export async function load() {
	return {
		taler: runtimeConfig.taler
	};
}

export const actions = paymentConfigActions({
	key: 'taler',
	processor: 'taler',
	schema: z.object({
		backendUrl: z
			.string()
			.min(1)
			.transform((v) => v.replace(/\/+$/, '')),
		backendApiKey: z.string().min(1),
		currency: z.enum(
			CURRENCIES.filter((c) => c !== 'BTC' && c !== 'SAT') as [Currency, ...Currency[]]
		)
	}),
	empty: { backendUrl: '', backendApiKey: '', currency: 'CHF' }
});
