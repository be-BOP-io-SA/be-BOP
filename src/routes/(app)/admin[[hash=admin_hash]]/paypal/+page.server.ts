import { runtimeConfig } from '$lib/server/runtime-config';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';
import { CURRENCIES, type Currency } from '$lib/types/Currency.js';
import { z } from 'zod';

export async function load() {
	return {
		paypal: runtimeConfig.paypal
	};
}

export const actions = paymentConfigActions({
	key: 'paypal',
	processor: 'paypal',
	schema: z.object({
		clientId: z.string().min(1),
		secret: z.string().min(1),
		sandbox: z.boolean({ coerce: true }),
		currency: z.enum(
			CURRENCIES.filter((c) => c !== 'BTC' && c !== 'SAT') as [Currency, ...Currency[]]
		)
	}),
	empty: { clientId: '', secret: '', currency: 'EUR', sandbox: false }
});
