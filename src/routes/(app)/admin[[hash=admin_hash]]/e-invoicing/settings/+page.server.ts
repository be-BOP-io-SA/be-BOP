import { runtimeConfig } from '$lib/server/runtime-config';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import { listPlatforms } from '$lib/server/e-invoice/platform/registry';
import { E_INVOICE_COUNTRIES, type EInvoiceCountry } from '$lib/types/EInvoice';
import { isFiatCurrency } from '$lib/types/Currency';
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
	}
};
