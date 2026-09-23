import { describe, expect, it } from 'vitest';
import './pp-registry';
import { getProcessorsForMethod } from './pp';
import { ALL_PAYMENT_METHODS, type PaymentMethod } from '../payment-methods';
import { ALL_PAYMENT_PROCESSOR_SLUGS, PROCESSORS } from '$lib/types/paymentProcessors';

/**
 * Registration order is live behaviour: `resolveProcessor` returns the first *enabled*
 * processor of a method when the shop expressed no preference. Today that order is the order
 * of the import statements in `pp-registry.ts`, which is invisible and easy to disturb — a
 * discovery mechanism that sorted by filename would quietly hand every shop's card traffic to
 * a different acquirer.
 *
 * These expectations are that order, written down. They must pass before the registry changes
 * and after.
 */
const EXPECTED_ORDER: Partial<Record<PaymentMethod, string[]>> = {
	card: ['sumup', 'stripe'],
	lightning: ['swiss-bitcoin-pay', 'btcpay-server', 'phoenixd', 'lnd', 'blink'],
	bitcoin: ['bitcoin-nodeless', 'bitcoind'],
	paypal: ['paypal'],
	taler: ['taler'],
	osb: ['osb'],
	'point-of-sale': ['point-of-sale'],
	free: ['free'],
	'bank-transfer': ['bank-transfer'],
	custom: ['custom']
};

describe('registration order', () => {
	for (const [method, expected] of Object.entries(EXPECTED_ORDER)) {
		it(`ranks ${method} processors in the order the shop falls back to`, () => {
			expect(
				getProcessorsForMethod(method as PaymentMethod).map((pp) => pp.meta.processor)
			).toEqual(expected);
		});
	}

	it('covers every payment method, so a new one cannot slip in unranked', () => {
		expect(Object.keys(EXPECTED_ORDER).sort()).toEqual([...ALL_PAYMENT_METHODS].sort());
	});
});

describe('the manifest agrees with the registry', () => {
	it('declares exactly the processors that register themselves', () => {
		const registered = ALL_PAYMENT_METHODS.flatMap((method) =>
			getProcessorsForMethod(method).map((pp) => pp.meta.processor)
		);
		expect([...registered].sort()).toEqual([...ALL_PAYMENT_PROCESSOR_SLUGS].sort());
	});

	it('gives each processor the method it actually serves', () => {
		for (const method of ALL_PAYMENT_METHODS) {
			for (const pp of getProcessorsForMethod(method)) {
				expect(PROCESSORS[pp.meta.processor].method).toBe(method);
			}
		}
	});

	// The point of `priority`: sorting by it must reproduce the order pinned above, so the
	// hand-written import list can be replaced without changing which processor wins.
	it('reproduces the fallback order when sorted by declared priority', () => {
		for (const [method, expected] of Object.entries(EXPECTED_ORDER)) {
			const byPriority = [...expected].sort(
				(a, b) =>
					PROCESSORS[a as keyof typeof PROCESSORS].priority -
					PROCESSORS[b as keyof typeof PROCESSORS].priority
			);
			expect(byPriority, `priorities disagree with registration order for ${method}`).toEqual(
				expected
			);
		}
	});

	it('gives no two processors of a method the same rank', () => {
		for (const expected of Object.values(EXPECTED_ORDER)) {
			const priorities = expected.map(
				(slug) => PROCESSORS[slug as keyof typeof PROCESSORS].priority
			);
			expect(new Set(priorities).size).toBe(priorities.length);
		}
	});
});
