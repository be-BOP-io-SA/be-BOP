import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
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
	save: async function ({ request }) {
		const btcpayServer = z
			.object({
				apiKey: z.string().min(1),
				serverUrl: z.string().url(),
				storeId: z.string().min(1).trim()
			})
			.parse(Object.fromEntries(await request.formData()));
		const isHttp = btcpayServer.serverUrl.startsWith('http://');
		const isHttps = btcpayServer.serverUrl.startsWith('https://');
		if (!isHttp && !isHttps) {
			throw new Error('BTCPay Server URL must specify the http or https protocol');
		}
		btcpayServer.serverUrl = btcpayServer.serverUrl.replace(/\/\s*$/, '').trim();
		await collections.runtimeConfig.updateOne(
			{
				_id: 'btcpayServer'
			},
			{
				$set: {
					data: btcpayServer,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		runtimeConfig.btcpayServer = btcpayServer;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({
			_id: 'btcpayServer'
		});
		runtimeConfig.btcpayServer = {
			apiKey: '',
			serverUrl: '',
			storeId: ''
		};
	},
	updateLightningInvoiceDescription
};
