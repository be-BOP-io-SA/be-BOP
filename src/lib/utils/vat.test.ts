import { describe, expect, it } from 'vitest';
import { computeVatRate } from './vat';

const CH_PROFILE = { _id: 'profile-ch', rates: { CH: 2.6 } } as const;

describe('computeVatRate', () => {
	it('falls back to the country rate when no profile is set', () => {
		expect(
			computeVatRate({
				productVatProfileId: undefined,
				vatProfiles: [],
				bebopCountry: 'CH',
				userCountry: 'CH',
				vatSingleCountry: true
			})
		).toBeGreaterThan(0);
	});

	it('prefers the profile rate over the country rate', () => {
		expect(
			computeVatRate({
				productVatProfileId: CH_PROFILE._id,
				vatProfiles: [CH_PROFILE],
				bebopCountry: 'CH',
				userCountry: 'CH',
				vatSingleCountry: true
			})
		).toBe(2.6);
	});

	// #2649: a shop that turned VAT off was still shown the country rate, and a price entered
	// VAT-included was divided by a tax it does not charge. The exemption wins over everything,
	// so any fee routed through here — a product, delivery, whatever comes next — inherits it.
	describe('when the shop is VAT exempt', () => {
		it('returns zero instead of the country rate', () => {
			expect(
				computeVatRate({
					productVatProfileId: undefined,
					vatProfiles: [],
					bebopCountry: 'CH',
					userCountry: 'CH',
					vatSingleCountry: true,
					vatExempted: true
				})
			).toBe(0);
		});

		it('returns zero even when a custom profile carries a rate', () => {
			expect(
				computeVatRate({
					productVatProfileId: CH_PROFILE._id,
					vatProfiles: [CH_PROFILE],
					bebopCountry: 'CH',
					userCountry: 'CH',
					vatSingleCountry: true,
					vatExempted: true
				})
			).toBe(0);
		});

		it('returns zero whatever the customer country', () => {
			expect(
				computeVatRate({
					productVatProfileId: undefined,
					vatProfiles: [],
					bebopCountry: 'CH',
					userCountry: 'FR',
					vatSingleCountry: false,
					vatExempted: true
				})
			).toBe(0);
		});
	});
});
