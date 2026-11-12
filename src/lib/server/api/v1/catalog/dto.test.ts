import { describe, expect, it } from 'vitest';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { toCatalogProductDto } from './dto';

describe('toCatalogProductDto', () => {
	it('exposes stable price in minor units and i18n name', () => {
		const dto = toCatalogProductDto(
			{
				...TEST_DIGITAL_PRODUCT,
				translations: { fr: { name: 'Produit test', shortDescription: 'Court' } }
			},
			'fr'
		);
		expect(dto.id).toBe(TEST_DIGITAL_PRODUCT._id);
		expect(dto.name).toBe('Produit test');
		expect(dto.shortDescription).toBe('Court');
		expect(dto.price).toEqual({ amountMinor: 10000, currency: 'EUR' });
		expect(dto.payWhatYouWant).toBe(false);
	});

	it('gives the values of each variation family, and only the supplements that are not zero', () => {
		const dto = toCatalogProductDto(
			{
				...TEST_DIGITAL_PRODUCT,
				variations: [
					{ name: 'key', value: 'abc', price: 0 },
					{ name: 'amount', value: '10' },
					{ name: 'key', value: 'def', price: 0 },
					{ name: 'amount', value: '20', price: 10 }
				]
			},
			'en'
		);
		expect(dto.variations).toEqual({ key: ['abc', 'def'], amount: ['10', '20'] });
		expect(dto.variationPrices).toEqual({
			amount: { '20': { amountMinor: 1000, currency: 'EUR' } }
		});
	});

	it('omits the supplements when no variation value adds anything', () => {
		const dto = toCatalogProductDto(
			{ ...TEST_DIGITAL_PRODUCT, variations: [{ name: 'key', value: 'abc', price: 0 }] },
			'en'
		);
		expect(dto.variations).toEqual({ key: ['abc'] });
		expect(dto).not.toHaveProperty('variationPrices');
		expect(toCatalogProductDto(TEST_DIGITAL_PRODUCT, 'en')).not.toHaveProperty('variations');
	});

	it('does not leak paidOrderWebhook secrets', () => {
		const dto = toCatalogProductDto(
			{
				...TEST_DIGITAL_PRODUCT,
				paidOrderWebhook: { apiRoute: 'https://evil.example', secret: 'shh' }
			},
			'en'
		);
		expect(JSON.stringify(dto)).not.toMatch(/shh/);
		expect(JSON.stringify(dto)).not.toMatch(/paidOrderWebhook/);
	});
});
