import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Product } from '$lib/types/Product';

const find = vi.fn();

vi.mock('$lib/server/database', () => ({
	collections: { vatProfiles: { find: (...args: unknown[]) => find(...args) } }
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { vatCountry: 'CH', vatExempted: false }
}));

import { loadCatalogVatRates } from './vat';
import { runtimeConfig } from '$lib/server/runtime-config';

const REDUCED = new ObjectId();

function product(overrides?: Partial<Product>): Product {
	return { _id: 'tartiflette', price: { amount: 10, currency: 'CHF' }, ...overrides } as Product;
}

function profilesReturn(docs: unknown[]) {
	find.mockReturnValue({ toArray: async () => docs });
}

describe('loadCatalogVatRates', () => {
	beforeEach(() => {
		find.mockReset();
		profilesReturn([]);
		runtimeConfig.vatCountry = 'CH';
		runtimeConfig.vatExempted = false;
	});

	it('resolves the country default when a product carries no profile', async () => {
		const rates = await loadCatalogVatRates([product()]);
		// Switzerland's standard rate, from $lib/types/Country.
		expect(rates.get('tartiflette')).toBe(8.1);
	});

	it('follows the shop country, not a buyer country', async () => {
		runtimeConfig.vatCountry = 'FR';
		expect((await loadCatalogVatRates([product()])).get('tartiflette')).toBe(20);
	});

	it('prefers the rate a product VAT profile sets for that country', async () => {
		profilesReturn([{ _id: REDUCED, name: 'Reduced', rates: { CH: 2.6 } }]);
		const rates = await loadCatalogVatRates([product({ vatProfileId: REDUCED })]);
		expect(rates.get('tartiflette')).toBe(2.6);
	});

	it('falls back to the country default when the profile has no rate for it', async () => {
		profilesReturn([{ _id: REDUCED, name: 'Reduced', rates: { FR: 5.5 } }]);
		const rates = await loadCatalogVatRates([product({ vatProfileId: REDUCED })]);
		expect(rates.get('tartiflette')).toBe(8.1);
	});

	it('publishes zero everywhere for a VAT-free shop', async () => {
		runtimeConfig.vatExempted = true;
		const rates = await loadCatalogVatRates([product(), product({ _id: 'banane' })]);
		expect([...rates.values()]).toEqual([0, 0]);
	});

	it('does not read the profile table when a VAT-free shop makes it irrelevant', async () => {
		runtimeConfig.vatExempted = true;
		await loadCatalogVatRates([product({ vatProfileId: REDUCED })]);
		expect(find).not.toHaveBeenCalled();
	});

	it('does not read the profile table when no product carries a profile', async () => {
		await loadCatalogVatRates([product(), product({ _id: 'banane' })]);
		expect(find).not.toHaveBeenCalled();
	});

	it('reads it once for a whole page, not once per product', async () => {
		profilesReturn([{ _id: REDUCED, name: 'Reduced', rates: { CH: 2.6 } }]);
		await loadCatalogVatRates([
			product({ vatProfileId: REDUCED }),
			product({ _id: 'banane', vatProfileId: REDUCED })
		]);
		expect(find).toHaveBeenCalledTimes(1);
	});

	it('rates every product of the page, profiled or not', async () => {
		profilesReturn([{ _id: REDUCED, name: 'Reduced', rates: { CH: 2.6 } }]);
		const rates = await loadCatalogVatRates([
			product({ vatProfileId: REDUCED }),
			product({ _id: 'banane' })
		]);
		expect(rates.get('tartiflette')).toBe(2.6);
		expect(rates.get('banane')).toBe(8.1);
	});

	it('short-circuits an empty page', async () => {
		expect((await loadCatalogVatRates([])).size).toBe(0);
		expect(find).not.toHaveBeenCalled();
	});
});
