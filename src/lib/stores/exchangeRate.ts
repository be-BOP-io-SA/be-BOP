import { writable } from 'svelte/store';
import type { RuntimeConfig } from '$lib/server/runtime-config';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';

export const defaultExchangeRate = {
	EUR: 30_000,
	CHF: 30_000,
	USD: 30_000,
	ZAR: 700_000,
	CDF: 96_755_481,
	XOF: 22_621_258,
	XAF: 22_621_258,
	SAT: SATOSHIS_PER_BTC,
	KES: 4_200_000,
	UGX: 110_000_000,
	GHS: 350_000,
	NGN: 27_000_000,
	TZS: 75_000_000,
	MAD: 320_000,
	CZK: 700_000
};

export type ExchangeRate = typeof defaultExchangeRate;

export const exchangeRate = writable<RuntimeConfig['exchangeRate']>(defaultExchangeRate);
