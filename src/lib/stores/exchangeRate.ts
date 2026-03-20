import { writable } from 'svelte/store';
import type { RuntimeConfig } from '$lib/server/runtime-config';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';

export const defaultExchangeRate: Record<string, number> = {
	SAT: SATOSHIS_PER_BTC
};

export type ExchangeRate = Record<string, number>;

export const exchangeRate = writable<RuntimeConfig['exchangeRate']>(defaultExchangeRate);
