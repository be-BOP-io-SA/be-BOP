import { exchangeRate } from '$lib/stores/exchangeRate';
import { computePriceForStorage, type Currency } from '$lib/types/Currency';
import type { Price } from '$lib/types/Order';
import { get } from 'svelte/store';

/**
 * Convert amount to target currency with storage precision (4 decimals for fiat, 8 for BTC).
 * Returns a Price object with currency and precision fields for type safety.
 *
 * Use this when storing prices in database to preserve full precision for VAT calculations.
 * For display purposes, use toCurrency() which rounds to FRACTION_DIGITS_PER_CURRENCY (2 decimals for fiat).
 *
 * @example
 * convertAmountToCurrencyForStorage('CHF', 4.625, 'CHF')
 * // Returns: { amount: 4.6250, currency: 'CHF', precision: 4 }
 *
 * @example
 * convertAmountToCurrencyForStorage('EUR', 100, 'CHF')  // with exchange rate
 * // Returns: { amount: 95.2341, currency: 'EUR', precision: 4 }
 */
export function convertAmountToCurrencyForStorage(
	targetCurrency: Currency,
	amount: number,
	fromCurrency: Currency
): Price {
	// If currencies are the same, round to storage precision
	if (fromCurrency === targetCurrency) {
		return computePriceForStorage(amount, targetCurrency);
	}

	// Convert through BTC as intermediate currency
	const bitcoinAmount = fromCurrency === 'BTC' ? amount : amount / get(exchangeRate)[fromCurrency];

	const converted =
		targetCurrency === 'BTC' ? bitcoinAmount : bitcoinAmount * get(exchangeRate)[targetCurrency];

	// Use existing function instead of duplicating rounding logic
	return computePriceForStorage(converted, targetCurrency);
}
