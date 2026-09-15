import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { testProcessorConnection } from './test-connection';
import { registerProcessor, type CreatePaymentParams, type PaymentProcessorDefinition } from './pp';
import PPTaler from './contrib/PPTaler';
import { exchangeRate } from '$lib/stores/exchangeRate';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';

describe('testProcessorConnection', () => {
	// Per test, not per file: other suites share this store and reset it as they go.
	beforeEach(() => exchangeRate.set({ SAT: SATOSHIS_PER_BTC, EUR: 30_000 }));

	afterEach(() => registerProcessor(PPTaler));

	function fake(over: Partial<PaymentProcessorDefinition> = {}) {
		const seen: CreatePaymentParams[] = [];
		registerProcessor({
			meta: { processor: 'taler', method: 'taler' },
			isEnabled: () => true,
			settlementCurrency: () => 'SAT',
			async createPayment(params) {
				seen.push(params);
				return { processor: 'taler' };
			},
			async checkPayment() {
				return { status: 'pending' };
			},
			...over
		} as PaymentProcessorDefinition);
		return seen;
	}

	it('probes with an amount in the processor currency, not a raw euro', async () => {
		const seen = fake();

		await testProcessorConnection('taler');

		// 1 EUR at the pinned rate is 1/30 000 BTC, i.e. 3 333 sats.
		expect(seen[0].toPay).toEqual({ amount: 3_333, currency: 'SAT' });
	});

	it('follows a processor that settles in the probe currency already', async () => {
		const seen = fake({ settlementCurrency: () => 'EUR' });

		await testProcessorConnection('taler');

		expect(seen[0].toPay).toEqual({ amount: 1, currency: 'EUR' });
	});

	it('reports a processor that is not configured', async () => {
		fake({ isEnabled: () => false });

		expect(await testProcessorConnection('taler')).toEqual({
			ok: false,
			reason: 'Processor is not configured (missing credentials).'
		});
	});

	it('does not echo the provider error back to the admin', async () => {
		fake({
			async createPayment() {
				throw new Error('Invalid API Key provided: sk_live_supersecret');
			}
		});

		const result = await testProcessorConnection('taler');

		expect(result.ok).toBe(false);
		expect(result.reason).not.toContain('sk_live');
	});
});
