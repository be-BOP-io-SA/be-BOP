import type { CountryAlpha2 } from '$lib/types/Country';
import { vatRate } from '$lib/types/Country';
import type { ObjectId } from 'mongodb';

/**
 * Computes the VAT rate for a product considering custom VAT profiles
 *
 * Every rate the shop shows or bills goes through here — a product, a delivery fee, and
 * whatever fee is added next. That is deliberate: the shop-wide exemption is settled once,
 * at the top of this function, so a new kind of fee inherits it without anyone remembering to
 * ask. Before that, "Disable VAT for my be-BOP" was honoured when the order was priced but not
 * when a rate was shown, and a shop entering a VAT-included price had it divided by a tax it
 * does not charge (#2649).
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
	/** "Disable VAT for my be-BOP". Nothing is taxed, whatever the country or profile says. */
	vatExempted?: boolean;
}): number {
	if (params.vatExempted) {
		return 0;
	}

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
 * Returns VAT multiplier: (1 + rate/100)
 */
export function vatMultiplier(rate: number): number {
	return 1 + rate / 100;
}

/**
 * Applies VAT to an amount
 */
export function applyVat(amount: number, rate: number): number {
	return amount * vatMultiplier(rate);
}

/**
 * Extracts VAT from an amount (divides by VAT multiplier)
 */
export function extractVat(amount: number, rate: number): number {
	return amount / (1 + rate / 100);
}
