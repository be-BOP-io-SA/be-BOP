import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Product } from '$lib/types/Product';
import type { VatProfile } from '$lib/types/VatProfile';
import { computeVatRate } from '$lib/utils/vat';

/**
 * VAT rate per product id, resolved against the shop's own country.
 *
 * Catalog prices are stored and published excluding VAT; the rate is what lets a caller show the
 * price a customer pays. be-BOP's own PoS resolves it in the browser from the product's VAT
 * profile, the profile table and the shop's country — the inputs are not published, so an external
 * register cannot reproduce that. Resolving here and publishing one number removes the possibility
 * of a caller computing it differently from be-BOP.
 *
 * Always the shop's country: a register sells on the premises, so the buyer's country never
 * enters. A shop trading VAT-free publishes 0 everywhere.
 */
export async function loadCatalogVatRates(products: Product[]): Promise<Map<string, number>> {
	const rates = new Map<string, number>();
	if (!products.length) {
		return rates;
	}
	if (runtimeConfig.vatExempted) {
		for (const product of products) {
			rates.set(product._id, 0);
		}
		return rates;
	}

	// Only fetched when at least one product carries a profile; the country default covers the rest.
	const profiles = products.some((product) => product.vatProfileId)
		? ((await collections.vatProfiles.find().toArray()) as VatProfile[])
		: [];

	for (const product of products) {
		rates.set(
			product._id,
			computeVatRate({
				productVatProfileId: product.vatProfileId,
				vatProfiles: profiles,
				bebopCountry: runtimeConfig.vatCountry,
				userCountry: undefined,
				vatSingleCountry: true
			})
		);
	}
	return rates;
}
