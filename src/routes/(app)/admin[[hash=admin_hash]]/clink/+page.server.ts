import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { rateLimit } from '$lib/server/rateLimit';
import { testProcessorConnection } from '$lib/server/sdk/test-connection';
import { clinkValidateNoffer } from '$lib/server/clink';
import { relayUrlIssue } from '$lib/server/webhook-url-guard';
import { z } from 'zod';

export async function load() {
	return {
		enabled: runtimeConfig.clink.enabled,
		nOffer: runtimeConfig.clink.nOffer,
		relayUrl: runtimeConfig.clink.relayUrl,
		lightningPubEndpoint: runtimeConfig.clink.lightningPubEndpoint,
		lightningPubToken: runtimeConfig.clink.lightningPubToken,
		lightningInvoiceDescription: runtimeConfig.lightningQrCodeDescription,
		brandName: runtimeConfig.brandName
	};
}

export const actions = {
	save: async function ({ request }) {
		const clink = z
			.object({
				enabled: z.boolean({ coerce: true }),
				nOffer: z.string().trim().default(''),
				relayUrl: z.string().trim().default('wss://relay.shocknet.app'),
				lightningPubEndpoint: z.string().trim().default(''),
				lightningPubToken: z.string().trim().default('')
			})
			.refine((v) => !v.enabled || v.nOffer, {
				message: 'An nOffer string is required when CLINK is enabled'
			})
			.refine((v) => !v.enabled || v.relayUrl, {
				message: 'A relay URL is required when CLINK is enabled'
			})
			.parse(Object.fromEntries(await request.formData()));

		// Validate nOffer format if provided
		if (clink.nOffer) {
			const validation = clinkValidateNoffer(clink.nOffer);
			if (!validation.valid) {
				throw new Error(`Invalid nOffer: ${validation.error}`);
			}
		}

		// Validate relay URL against SSRF
		const relayIssue = relayUrlIssue(clink.relayUrl);
		if (relayIssue) {
			throw new Error(`Invalid relay URL: ${relayIssue}`);
		}

		await collections.runtimeConfig.updateOne(
			{ _id: 'clink' },
			{
				$set: {
					data: clink,
					updatedAt: new Date()
				}
			},
			{ upsert: true }
		);
		runtimeConfig.clink = clink;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({ _id: 'clink' });
		runtimeConfig.clink = {
			enabled: false,
			nOffer: '',
			relayUrl: 'wss://relay.shocknet.app',
			lightningPubEndpoint: '',
			lightningPubToken: ''
		};
	},
	updateLightningInvoiceDescription,
	testConnection: async function ({ locals }) {
		rateLimit(locals.clientIp, 'pp.test.clink', 5, { minutes: 1 });
		return await testProcessorConnection('clink');
	}
};
