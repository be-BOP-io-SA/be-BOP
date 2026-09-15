import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { paymentConfigActions } from '$lib/server/sdk/admin-config';
import { z } from 'zod';

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
	...paymentConfigActions({
		key: 'btcpayServer',
		processor: 'btcpay-server',
		schema: z.object({
			apiKey: z.string().min(1),
			serverUrl: z
				.string()
				.url()
				.refine((v) => v.startsWith('http://') || v.startsWith('https://'), {
					message: 'BTCPay Server URL must specify the http or https protocol'
				})
				.transform((v) => v.replace(/\/\s*$/, '').trim()),
			storeId: z.string().min(1).trim()
		}),
		empty: { apiKey: '', serverUrl: '', storeId: '' }
	}),
	updateLightningInvoiceDescription
};
