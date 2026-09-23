import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';
import { CURRENCIES, type Currency } from '$lib/types/Currency.js';
import { z } from 'zod';

export async function load() {
	return {
		stripe: runtimeConfig.stripe
	};
}

export const actions = paymentConfigActions({
	key: 'stripe',
	processor: 'stripe',
	schema: z.object({
		publicKey: z.string().startsWith('pk_'),
		secretKey: z.string().startsWith('sk_'),
		currency: z.enum(
			CURRENCIES.filter((c) => c !== 'BTC' && c !== 'SAT') as [Currency, ...Currency[]]
		)
	})
});
