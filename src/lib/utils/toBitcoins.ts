import type { Currency } from '$lib/types/Currency';
import { toCurrency } from './toCurrency';

export function toBitcoins(amount: number, currency: Currency): number {
	return toCurrency('BTC', amount, currency);
}
