import { exchangeRate } from '$lib/stores/exchangeRate';
import { FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';
import { get } from 'svelte/store';

export function toCurrency(
	targetCurrency: Currency,
	amount: number,
	fromCurrency: Currency
): number {
	// Just fix the rounding if the currencies are the same
	if (fromCurrency === targetCurrency) {
		return (
			Math.round(amount * Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[targetCurrency])) /
			Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[targetCurrency])
		);
	}

	const rates = get(exchangeRate);
	const fromRate = fromCurrency === 'BTC' ? 1 : rates[fromCurrency as keyof typeof rates];
	const toRate = targetCurrency === 'BTC' ? 1 : rates[targetCurrency as keyof typeof rates];

	// If exchange rates not available yet, return amount as-is (rates fetched from API)
	if (fromRate === undefined || toRate === undefined) {
		return (
			Math.round(amount * Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[targetCurrency])) /
			Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[targetCurrency])
		);
	}

	const bitcoinAmount = fromCurrency === 'BTC' ? amount : amount / fromRate;
	const ret = targetCurrency === 'BTC' ? bitcoinAmount : bitcoinAmount * toRate;

	return (
		Math.round(ret * Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[targetCurrency])) /
		Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[targetCurrency])
	);
}
