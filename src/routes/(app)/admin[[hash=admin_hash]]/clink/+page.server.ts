import { collections } from '$lib/server/database.js';
import { runtimeConfig } from '$lib/server/runtime-config';
import { updateLightningInvoiceDescription } from '$lib/server/actions.js';
import { rateLimit } from '$lib/server/rateLimit';
import { testProcessorConnection } from '$lib/server/sdk/test-connection';
import { clinkValidateNoffer } from '$lib/server/clink';
import { relayUrlIssue, webhookApiRouteIssue } from '$lib/server/webhook-url-guard';
import { z } from 'zod';

export async function load() {
	return {
		nOffer: runtimeConfig.clink.nOffer,
		relayUrl: runtimeConfig.clink.relayUrl,
		backend: runtimeConfig.clink.backend,
		lightningPubEndpoint: runtimeConfig.clink.lightningPubEndpoint,
		lightningPubToken: runtimeConfig.clink.lightningPubToken,
		lightningInvoiceDescription: runtimeConfig.lightningQrCodeDescription,
		brandName: runtimeConfig.brandName
	};
}

const clinkSchema = z
	.object({
		nOffer: z.string().trim().default(''),
		relayUrl: z.string().trim().default('wss://strfry.shock.network'),
		backend: z.enum(['lightning-pub', 'processor']).default('processor'),
		lightningPubEndpoint: z.string().trim().default(''),
		lightningPubToken: z.string().trim().default('')
	})
	.superRefine((value, ctx) => {
		if (value.nOffer && !value.relayUrl) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'A relay URL is required when an nOffer is set'
			});
		}
		if (value.backend === 'lightning-pub') {
			if (!value.lightningPubEndpoint) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'A Lightning.Pub endpoint is required for the Lightning.Pub backend'
				});
			}
			if (!value.lightningPubToken) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'A Lightning.Pub token is required for the Lightning.Pub backend'
				});
			}
		}
	});

export const actions = {
	save: async function ({ request }) {
		const parsed = clinkSchema.parse(Object.fromEntries(await request.formData()));

		// Validate nOffer format if provided
		if (parsed.nOffer) {
			const validation = clinkValidateNoffer(parsed.nOffer);
			if (!validation.valid) {
				throw new Error(`Invalid nOffer: ${validation.error}`);
			}
		}

		// Validate relay URL against SSRF
		const relayIssue = relayUrlIssue(parsed.relayUrl);
		if (relayIssue) {
			throw new Error(`Invalid relay URL: ${relayIssue}`);
		}

		// Validate Lightning.Pub endpoint against SSRF
		if (parsed.backend === 'lightning-pub' && parsed.lightningPubEndpoint) {
			const endpointIssue = webhookApiRouteIssue(parsed.lightningPubEndpoint);
			if (endpointIssue) {
				throw new Error(`Invalid Lightning.Pub endpoint: ${endpointIssue}`);
			}
		}

		await collections.runtimeConfig.updateOne(
			{ _id: 'clink' },
			{
				$set: {
					data: parsed,
					updatedAt: new Date()
				}
			},
			{ upsert: true }
		);
		runtimeConfig.clink = parsed;
	},
	delete: async function () {
		await collections.runtimeConfig.deleteOne({ _id: 'clink' });
		runtimeConfig.clink = {
			nOffer: '',
			relayUrl: 'wss://strfry.shock.network',
			backend: 'processor',
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
