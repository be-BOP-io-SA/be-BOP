import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';
import { z } from 'zod';

export async function load() {
	return {
		apiKey: runtimeConfig.swissBitcoinPay.apiKey,
		lightningInvoiceDescription: runtimeConfig.lightningQrCodeDescription
	};
}

export const actions = {
	...paymentConfigActions({
		key: 'swissBitcoinPay',
		processor: 'swiss-bitcoin-pay',
		schema: z.object({ apiKey: z.string().min(1) }),
		empty: { apiKey: '' }
	}),
	updateLightningInvoiceDescription
};
