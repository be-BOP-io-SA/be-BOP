import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { rateLimit } from '$lib/server/rateLimit';
import { testProcessorConnection } from '$lib/server/sdk/test-connection';
import { z } from 'zod';

export async function load() {
	return {
		apiKey: runtimeConfig.swissBitcoinPay.apiKey,
		lightningInvoiceDescription: runtimeConfig.lightningQrCodeDescription
	};
}

export const actions = {
	save: async function ({ request }) {
		const swissBitcoinPay = z
			.object({
				apiKey: z.string().min(1)
			})
			.parse(Object.fromEntries(await request.formData()));
		await collections.runtimeConfig.updateOne(
			{
				_id: 'swissBitcoinPay'
			},
			{
				$set: {
					data: swissBitcoinPay,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		runtimeConfig.swissBitcoinPay = swissBitcoinPay;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({
			_id: 'swissBitcoinPay'
		});
		runtimeConfig.swissBitcoinPay = {
			apiKey: ''
		};
	},
	updateLightningInvoiceDescription,
	testConnection: async function ({ locals }) {
		rateLimit(locals.clientIp, 'pp.test.swiss-bitcoin-pay', 5, { minutes: 1 });
		return await testProcessorConnection('swiss-bitcoin-pay');
	}
};
