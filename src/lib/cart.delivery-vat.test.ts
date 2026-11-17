import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import { computePriceInfo, deliveryFeesVatOf, type DeliveryFeesVat } from './cart';
import { exchangeRate } from './stores/exchangeRate';
import { SATOSHIS_PER_BTC } from './types/Currency';

const REDUCED = { _id: 'reduced', rates: { FR: 5.5 } };
// 80 € at 5.5 % and 20 € at the French standard 20 %: shares of 80 % and 20 % of the cart.
const REDUCED_PRODUCT = {
	_id: 'reduced-product',
	shipping: true,
	price: { amount: 80, currency: 'EUR' as const },
	vatProfileId: 'reduced'
};
const STANDARD_PRODUCT = {
	_id: 'standard-product',
	shipping: true,
	price: { amount: 20, currency: 'EUR' as const }
};
const BOTH = [
	{ product: REDUCED_PRODUCT, quantity: 1 },
	{ product: STANDARD_PRODUCT, quantity: 1 }
];

function priceInfo(
	items: typeof BOTH,
	deliveryFeesVat: DeliveryFeesVat | undefined,
	overrides: Partial<Parameters<typeof computePriceInfo>[1]> = {}
) {
	return computePriceInfo(items, {
		bebopCountry: 'FR',
		deliveryFees: { amount: 10, currency: 'EUR' },
		deliveryFeesVat,
		freeProductUnits: {},
		userCountry: 'FR',
		vatExempted: false,
		vatNullOutsideSellerCountry: false,
		vatProfiles: [REDUCED],
		vatSingleCountry: false,
		...overrides
	});
}

function vatAt(info: ReturnType<typeof computePriceInfo>, rate: number) {
	return info.vat.find((v) => v.rate === rate)?.price.amount;
}

const vat = (mode: DeliveryFeesVat['mode'], profileId: string | null = null): DeliveryFeesVat => ({
	mode,
	profileId,
	included: false
});

describe('VAT on delivery fees', () => {
	let previousRates: Record<string, number>;
	beforeAll(() => {
		previousRates = get(exchangeRate);
		// 1 € = 1,000 sats, so the shares read in satoshis stay exact.
		exchangeRate.set({ SAT: SATOSHIS_PER_BTC, EUR: 100_000 });
	});
	afterAll(() => {
		exchangeRate.set(previousRates);
	});

	it('applies the shop standard rate by default', () => {
		const info = priceInfo([BOTH[0]], undefined);
		expect(vatAt(info, 20)).toBeCloseTo(2, 2);
		expect(vatAt(info, 5.5)).toBeCloseTo(4.4, 2);
	});

	it('applies the highest rate among the cart products', () => {
		expect(vatAt(priceInfo(BOTH, vat('highest')), 20)).toBeCloseTo(6, 2);
		expect(vatAt(priceInfo(BOTH, vat('highest')), 5.5)).toBeCloseTo(4.4, 2);

		const reducedOnly = priceInfo([BOTH[0]], vat('highest'));
		expect(vatAt(reducedOnly, 5.5)).toBeCloseTo(4.95, 2);
		expect(vatAt(reducedOnly, 20)).toBeUndefined();
	});

	it('splits the fees between the product rates, prorated on the cart total excluding VAT', () => {
		const info = priceInfo(BOTH, vat('prorata'));
		// 8 € of the fees at 5.5 %, 2 € at 20 %.
		expect(vatAt(info, 5.5)).toBeCloseTo(4.4 + 0.44, 2);
		expect(vatAt(info, 20)).toBeCloseTo(4 + 0.4, 2);
	});

	it('applies the chosen profile in custom mode', () => {
		const info = priceInfo([BOTH[1]], vat('custom', 'reduced'));
		expect(vatAt(info, 5.5)).toBeCloseTo(0.55, 2);
		expect(vatAt(info, 20)).toBeCloseTo(4, 2);
	});

	it('adds no VAT to the fees in none mode', () => {
		const info = priceInfo(BOTH, vat('none'));
		expect(vatAt(info, 20)).toBeCloseTo(4, 2);
		expect(vatAt(info, 5.5)).toBeCloseTo(4.4, 2);
		expect(info.deliveryFeesHt.amount).toBe(10);
	});

	it('takes the prorated VAT out of fees entered VAT included', () => {
		// 8.4 % on average: 80 % of the fees at 5.5 %, 20 % at 20 %.
		const info = priceInfo(
			BOTH,
			{ mode: 'prorata', profileId: null, included: true },
			{ deliveryFees: { amount: 10.84, currency: 'EUR' } }
		);
		expect(info.deliveryFeesHt.amount).toBeCloseTo(10, 6);
		expect(vatAt(info, 5.5)).toBeCloseTo(4.84, 2);
	});

	it('keeps the fees exempt when physical goods are exempt for the customer country', () => {
		const info = priceInfo(BOTH, vat('prorata'), {
			userCountry: 'DE',
			vatNullOutsideSellerCountry: true
		});
		expect(info.vat).toHaveLength(0);
	});
});

describe('deliveryFeesVatOf', () => {
	it('reads a shop saved before the mode existed from its profile', () => {
		expect(deliveryFeesVatOf({ vatProfileId: 'reduced' })).toEqual({
			mode: 'custom',
			profileId: 'reduced',
			included: false
		});
		expect(deliveryFeesVatOf({ vatProfileId: null, vatIncludedReference: true })).toEqual({
			mode: 'standard',
			profileId: null,
			included: true
		});
	});

	it('ignores a profile outside custom mode', () => {
		expect(deliveryFeesVatOf({ vatMode: 'none', vatProfileId: 'reduced' }).profileId).toBeNull();
	});
});
