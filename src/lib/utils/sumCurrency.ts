import { UNDERLYING_CURRENCY, type Currency } from '$lib/types/Currency';
import { toCurrency } from './toCurrency';
import { sum } from './sum';
import type { Price } from '$lib/types/Order';
import { fixCurrencyRounding } from './fixCurrencyRounding';

/**
 * Sum currencies, using the priceReferenceCurrency as intermediary if needed
 */
export function sumCurrency(to: Currency, items: Price[]): number {
	if (items.every((item) => item.currency === to)) {
		return fixCurrencyRounding(sum(items.map((item) => item.amount)), to);
	}

	if (items.every((item) => item.currency === items[0].currency)) {
		return toCurrency(to, sum(items.map((item) => item.amount)), items[0].currency);
	}

	const refCurrency = UNDERLYING_CURRENCY; //get(currencies).priceReference;

	const amounts = items.map((item) => toCurrency(refCurrency, item.amount, item.currency));

	return toCurrency(to, sum(amounts), refCurrency);
}
