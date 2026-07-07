import { FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency';

/**
 * Format a bare price amount for display, trimming needless trailing zeros the same way
 * PriceTag.svelte does: crypto (BTC/SAT) and whole numbers show no decimals (so `420` in BTC
 * renders as `420`, not `420.00000000`), while fractional fiat keeps its currency's digits.
 *
 * This is a plain string helper — not the PriceTag component — because the price-calendar chart
 * renders labels inside `<svg><text>` where a Svelte component (a `<div>`) cannot be embedded.
 * Keeping the number formatting here lets the chart, axis and KPI cards all format identically.
 */
export function formatCurrencyAmount(amount: number, currency: string): string {
	const max =
		FRACTION_DIGITS_PER_CURRENCY[currency as keyof typeof FRACTION_DIGITS_PER_CURRENCY] ?? 2;
	const isCrypto = currency === 'BTC' || currency === 'SAT';
	const min = !Number.isInteger(amount) && !isCrypto ? max : 0;
	return amount.toLocaleString('en', { maximumFractionDigits: max, minimumFractionDigits: min });
}
