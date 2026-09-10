import { FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';
import type { Price } from '$lib/types/Order';

/** Convert integer minor units (API contract) to a major-unit amount. */
export function minorToAmount(amountMinor: number, currency: Currency): number {
	const digits = FRACTION_DIGITS_PER_CURRENCY[currency];
	return amountMinor / Math.pow(10, digits);
}

/** Convert a major-unit amount to integer minor units. */
export function amountToMinor(amount: number, currency: Currency): number {
	const digits = FRACTION_DIGITS_PER_CURRENCY[currency];
	return Math.round(amount * Math.pow(10, digits));
}

export function minorToPrice(amountMinor: number, currency: Currency): Price {
	return { amount: minorToAmount(amountMinor, currency), currency };
}
