import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';

export async function load() {
	const config = runtimeConfig.btcpayServer;
	return {
		apiKey: config.apiKey,
		lightningInvoiceDescription: runtimeConfig.lightningQrCodeDescription,
		serverUrl: config.serverUrl,
		storeId: config.storeId
	};
}

export const actions = {
	...paymentConfigActions({ key: 'btcpayServer', processor: 'btcpay-server' }),
	updateLightningInvoiceDescription
};
