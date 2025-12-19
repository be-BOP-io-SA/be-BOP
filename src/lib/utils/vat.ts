import type { CountryAlpha2 } from '$lib/types/Country';
import { vatRate } from '$lib/types/Country';
import type { ObjectId } from 'mongodb';

/**
 * Computes the VAT rate for a product considering custom VAT profiles
 */
export function computeVatRate(params: {
	productVatProfileId: string | ObjectId | undefined;
	vatProfiles: Array<{
		_id: string | ObjectId;
		rates: Partial<Record<CountryAlpha2, number>>;
	}>;
	bebopCountry: CountryAlpha2 | undefined;
	userCountry: CountryAlpha2 | undefined;
	vatSingleCountry: boolean;
}): number {
	const country = params.vatSingleCountry
		? params.bebopCountry
		: params.userCountry ?? params.bebopCountry;

	if (!country) {
		return 0;
	}

	const vatProfile = params.productVatProfileId
		? params.vatProfiles.find(
				(profile) => profile._id.toString() === params.productVatProfileId?.toString()
		  )
		: undefined;

	return vatProfile?.rates[country] ?? vatRate(country);
}

/**
 * Returns VAT multiplier: 1.0 if VAT should not be applied, or (1 + rate/100) if it should
 */
export function vatMultiplier(rate: number, shouldApplyVat: boolean): number {
	return shouldApplyVat ? 1 + rate / 100 : 1;
}

/**
 * Applies VAT to an amount if shouldApplyVat is true
 */
export function applyVat(amount: number, rate: number, shouldApplyVat: boolean): number {
	return amount * vatMultiplier(rate, shouldApplyVat);
}

/**
 * Extracts VAT from an amount (divides by VAT multiplier)
 */
export function extractVat(amount: number, rate: number): number {
	return amount / (1 + rate / 100);
}
