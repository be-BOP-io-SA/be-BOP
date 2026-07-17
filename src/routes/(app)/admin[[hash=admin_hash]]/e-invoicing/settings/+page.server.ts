import { runtimeConfig } from '$lib/server/runtime-config';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import { listPlatforms } from '$lib/server/e-invoice/platform/registry';
import { openApiPdpAccessToken } from '$lib/server/e-invoice/platform/contrib/OpenApiPdp';
import { E_INVOICE_COUNTRIES, type EInvoiceCountry } from '$lib/types/EInvoice';
import { isFiatCurrency } from '$lib/types/Currency';
import { rateLimit } from '$lib/server/rateLimit';
import { z } from 'zod';

export function load() {
	// Non-blocking configuration warnings shown on the settings page
	const seller = runtimeConfig.sellerIdentity;
	const hasFiatCurrency =
		(runtimeConfig.accountingCurrency && isFiatCurrency(runtimeConfig.accountingCurrency)) ||
		(runtimeConfig.secondaryCurrency && isFiatCurrency(runtimeConfig.secondaryCurrency)) ||
		isFiatCurrency(runtimeConfig.mainCurrency);

	return {
		eInvoicing: runtimeConfig.eInvoicing,
		openApiPdp: runtimeConfig.openApiPdp,
		countries: E_INVOICE_COUNTRIES,
		platforms: listPlatforms().map((platform) => platform.meta),
		warnings: {
			missingSellerIdentity: !seller,
			missingSiret: !!seller && !seller.legal?.siret,
			missingVatNumber: !!seller && !seller.vatNumber,
			noFiatCurrency: !hasFiatCurrency
		}
	};
}

export const actions = {
	update: async ({ request }) => {
		const formData = await request.formData();

		const parsed = z
			.object({
				enabled: z.boolean({ coerce: true }).default(false),
				country: z.enum(E_INVOICE_COUNTRIES),
				platform: z.enum(
					listPlatforms().map((platform) => platform.meta.id) as [string, ...string[]]
				)
			})
			.parse({
				enabled: formData.get('enabled'),
				country: formData.get('country'),
				platform: formData.get('platform')
			});

		const value = {
			enabled: parsed.enabled,
			country: parsed.country as EInvoiceCountry,
			platform: parsed.platform
		};
		runtimeConfig.eInvoicing = value;
		await persistConfigElement('eInvoicing', value);
	},

	saveConnection: async ({ request }) => {
		const openApiPdp = z
			.object({
				baseUrl: z.string().url(),
				apiVersion: z.string().min(1),
				clientId: z.string().min(1),
				clientSecret: z.string().min(1)
			})
			.parse(Object.fromEntries(await request.formData()));

		runtimeConfig.openApiPdp = openApiPdp;
		await persistConfigElement('openApiPdp', openApiPdp);
	},

	deleteConnection: async () => {
		const openApiPdp = { baseUrl: '', apiVersion: 'v1.beta', clientId: '', clientSecret: '' };
		runtimeConfig.openApiPdp = openApiPdp;
		await persistConfigElement('openApiPdp', openApiPdp);
	},

	testConnection: async ({ locals }) => {
		rateLimit(locals.clientIp, 'admin.test.openapi-pdp', 5, { minutes: 1 });
		try {
			await openApiPdpAccessToken();
			return { ok: true };
		} catch (err) {
			console.error('testConnection(openapi-pdp) raw error:', err);
			return {
				ok: false,
				reason: 'Connection failed. Please verify the saved credentials and try again.'
			};
		}
	}
};
