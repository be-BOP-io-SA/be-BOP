import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';

export async function load() {
	return {
		apiKey: runtimeConfig.blink.apiKey,
		lnAddress: runtimeConfig.blink.lnAddress,
		walletId: runtimeConfig.blink.walletId,
		lightningInvoiceDescription: runtimeConfig.lightningQrCodeDescription
	};
}

export const actions = {
	...paymentConfigActions({ key: 'blink', processor: 'blink' }),
	updateLightningInvoiceDescription
};
