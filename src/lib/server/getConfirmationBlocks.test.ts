import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { runtimeConfig } from './runtime-config';
import { getConfirmationBlocks } from './getConfirmationBlocks';
import { toBitcoins } from '$lib/utils/toBitcoins';
import { exchangeRate, defaultExchangeRate } from '$lib/stores/exchangeRate';

describe('getConfirmationBlocks', () => {
	let oldConfig: typeof runtimeConfig.confirmationBlocksThresholds;
	let oldRates: Parameters<typeof exchangeRate.set>[0];
	beforeAll(() => {
		oldConfig = runtimeConfig.confirmationBlocksThresholds;
		// `toBitcoins` reads the `exchangeRate` *store* (not runtimeConfig), which is otherwise only
		// synced by another test's cleanDb/refresh — seed it here so this suite is self-contained and
		// order-independent, then restore it in afterAll.
		oldRates = get(exchangeRate);
		exchangeRate.set({ ...defaultExchangeRate, CHF: 30_000 });
		runtimeConfig.exchangeRate.CHF = 30_000;
		runtimeConfig.confirmationBlocksThresholds = {
			currency: 'CHF',
			defaultBlocks: 1,
			thresholds: [
				{
					minAmount: 0,
					maxAmount: 100,
					confirmationBlocks: 2
				},
				{
					minAmount: 101,
					maxAmount: 200,
					confirmationBlocks: 3
				},
				{
					minAmount: 201,
					maxAmount: 300,
					confirmationBlocks: 4
				}
			]
		};
	});

	it('should return the starting number of blocks', () => {
		expect(getConfirmationBlocks({ amount: 50, currency: 'CHF' })).toBe(2);
	});

	it('should return the correct number of blocks', () => {
		expect(getConfirmationBlocks({ amount: 150, currency: 'CHF' })).toBe(3);
	});

	it('should return the correct number of blocks', () => {
		expect(getConfirmationBlocks({ amount: 250, currency: 'CHF' })).toBe(4);
	});

	it('should work with payment in BTC and threshold in CHF', () => {
		expect(getConfirmationBlocks({ amount: toBitcoins(50, 'CHF'), currency: 'BTC' })).toBe(2);
		expect(getConfirmationBlocks({ amount: toBitcoins(150, 'CHF'), currency: 'BTC' })).toBe(3);
		expect(getConfirmationBlocks({ amount: toBitcoins(250, 'CHF'), currency: 'BTC' })).toBe(4);
	});

	afterAll(() => {
		runtimeConfig.confirmationBlocksThresholds = oldConfig;
		exchangeRate.set(oldRates);
	});
});
