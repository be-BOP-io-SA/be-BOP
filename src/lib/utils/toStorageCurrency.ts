import { exchangeRate } from '$lib/stores/exchangeRate';
import {
	FRACTION_DIGITS_PER_CURRENCY,
	STORAGE_FRACTION_DIGITS_PER_CURRENCY,
	type Currency
} from '$lib/types/Currency';
import { get } from 'svelte/store';

/**
 * Convert amount to target currency with storage precision (4 decimals for fiat, 8 for BTC).
 * Use this when storing prices in database to preserve full precision for VAT calculations.
 *
 * For display purposes, use toCurrency() which rounds to FRACTION_DIGITS_PER_CURRENCY (2 decimals for fiat).
 */
export function toStorageCurrency(
	targetCurrency: Currency,
	amount: number,
	fromCurrency: Currency
): number {
	// If currencies are the same, round to storage precision
	if (fromCurrency === targetCurrency) {
		return (
			Math.round(amount * Math.pow(10, STORAGE_FRACTION_DIGITS_PER_CURRENCY[targetCurrency])) /
			Math.pow(10, STORAGE_FRACTION_DIGITS_PER_CURRENCY[targetCurrency])
		);
	}

	// Convert through BTC as intermediate currency
	const bitcoinAmount = fromCurrency === 'BTC' ? amount : amount / get(exchangeRate)[fromCurrency];

	const ret =
		targetCurrency === 'BTC' ? bitcoinAmount : bitcoinAmount * get(exchangeRate)[targetCurrency];

	// For display precision (2 decimals) when converting between different currencies
	// We still use FRACTION_DIGITS for cross-currency conversions because exchange rates
	// already introduce imprecision
	return (
		Math.round(ret * Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[targetCurrency])) /
		Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[targetCurrency])
	);
}
