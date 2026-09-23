import { describe, expect, it } from 'vitest';
import { checkProductVariationsIntegrity, productPriceWithVariations } from './Product';

const TSHIRT = {
	_id: 'tshirt',
	name: 'T-shirt',
	price: { amount: 10, currency: 'EUR' as const },
	variations: [
		{ name: 'size', value: 'S', price: 0 },
		{ name: 'size', value: 'XXL', price: 30 },
		{ name: 'color', value: 'black', price: 5 }
	]
};

describe('checkProductVariationsIntegrity', () => {
	it('accepts a combination the catalogue offers', () => {
		expect(checkProductVariationsIntegrity(TSHIRT, { size: 'XXL', color: 'black' })).toBe(true);
	});

	it('rejects a missing variation name', () => {
		expect(checkProductVariationsIntegrity(TSHIRT, { size: 'XXL' })).toBe(false);
	});

	// An unknown value used to pass the name-only check and then price at +0, selling the
	// surcharged option for the base price.
	it('rejects a value the catalogue does not offer', () => {
		expect(checkProductVariationsIntegrity(TSHIRT, { size: 'XXL_', color: 'black' })).toBe(false);
		expect(checkProductVariationsIntegrity(TSHIRT, { size: 'XXL', color: 'gold' })).toBe(false);
	});

	it('rejects a value borrowed from another variation name', () => {
		expect(checkProductVariationsIntegrity(TSHIRT, { size: 'black', color: 'XXL' })).toBe(false);
	});
});

describe('productPriceWithVariations', () => {
	it('adds the surcharge of each chosen option', () => {
		expect(productPriceWithVariations(TSHIRT, { size: 'XXL', color: 'black' })).toBe(45);
	});

	it('bills an unknown pair as nothing, which is why the integrity check must reject it first', () => {
		expect(productPriceWithVariations(TSHIRT, { size: 'XXL_', color: 'black' })).toBe(15);
	});
});
