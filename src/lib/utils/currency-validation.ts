import { FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';

/** True when `amount` has more decimal places than `currency` supports (e.g. 19.99 on XPF). */
export function hasMoreDecimalsThanCurrency(amount: number, currency: Currency): boolean {
	if (Number.isInteger(amount)) {
		return false;
	}
	const decimals = amount.toString().split('.')[1]?.length ?? 0;
	return decimals > FRACTION_DIGITS_PER_CURRENCY[currency];
}
