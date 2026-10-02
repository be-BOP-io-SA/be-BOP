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
