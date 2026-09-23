import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';
import { z } from 'zod';

export async function load() {
	return {
		apiKey: runtimeConfig.blink.apiKey,
		lnAddress: runtimeConfig.blink.lnAddress,
		walletId: runtimeConfig.blink.walletId,
		lightningInvoiceDescription: runtimeConfig.lightningQrCodeDescription
	};
}

export const actions = {
	...paymentConfigActions({
		key: 'blink',
		processor: 'blink',
		schema: z
			.object({
				apiKey: z.string().trim().default(''),
				lnAddress: z.string().trim().default(''),
				walletId: z.string().trim().default('')
			})
			.refine((v) => v.apiKey || v.lnAddress, {
				message: 'Provide either a Lightning address or an API key'
			})
	}),
	updateLightningInvoiceDescription
};
