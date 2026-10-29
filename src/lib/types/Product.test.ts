import { describe, expect, it } from 'vitest';
import { checkProductVariationsIntegrity } from './Product';

const product = {
	_id: 'bracelet',
	name: 'Bracelet',
	price: { amount: 10, currency: 'EUR' as const },
	variations: [
		{ name: 'load', value: 'load10' },
		{ name: 'load', value: 'load20' },
		{ name: 'color', value: 'red' }
	]
};

describe('checkProductVariationsIntegrity', () => {
	it('accepts one offered value per family', () => {
		expect(checkProductVariationsIntegrity(product, { load: 'load20', color: 'red' })).toBe(true);
	});

	it('refuses a family left out', () => {
		expect(checkProductVariationsIntegrity(product, { load: 'load20' })).toBe(false);
	});

	it.each(['', 'load99'])('refuses the value %j the product does not offer', (value) => {
		expect(checkProductVariationsIntegrity(product, { load: value, color: 'red' })).toBe(false);
	});
});
