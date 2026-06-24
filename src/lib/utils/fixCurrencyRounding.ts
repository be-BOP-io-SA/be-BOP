import { FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';
import { toCurrency } from './toCurrency';

export function fixCurrencyRounding(amount: number, currency: Currency): number {
	return toCurrency(currency, amount, currency);
}

/**
 * Round `amount` DOWN to the currency's display precision — used for discounts so rounding
 * favors the customer (a smaller-than-stated discount can be illegal).
 */
export function roundDownToCurrency(amount: number, currency: Currency): number {
	const factor = Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[currency]);
	return Math.floor(amount * factor) / factor;
}
