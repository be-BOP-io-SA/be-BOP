import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { rateLimit } from '$lib/server/rateLimit';
import { testProcessorConnection } from '$lib/server/sdk/test-connection';
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
	save: async function ({ request }) {
		const blink = z
			.object({
				apiKey: z.string().trim().default(''),
				lnAddress: z.string().trim().default(''),
				walletId: z.string().trim().default('')
			})
			.refine((v) => v.apiKey || v.lnAddress, {
				message: 'Provide either a Lightning address or an API key'
			})
			.parse(Object.fromEntries(await request.formData()));
		await collections.runtimeConfig.updateOne(
			{
				_id: 'blink'
			},
			{
				$set: {
					data: blink,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		runtimeConfig.blink = blink;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({
			_id: 'blink'
		});
		runtimeConfig.blink = {
			apiKey: '',
			lnAddress: '',
			walletId: ''
		};
	},
	updateLightningInvoiceDescription,
	testConnection: async function ({ locals }) {
		rateLimit(locals.clientIp, 'pp.test.blink', 5, { minutes: 1 });
		return await testProcessorConnection('blink');
	}
};
