import { describe, expect, it } from 'vitest';
import { coversPayment, type PaymentProcessorDefinition } from './pp';
import { exchangeRate } from '$lib/stores/exchangeRate';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';
import type { Order, Price } from '$lib/types/Order';

const processor = (over: Partial<PaymentProcessorDefinition> = {}) =>
	({ meta: { processor: 'taler', method: 'taler' }, ...over }) as PaymentProcessorDefinition;

const paymentOf = (amount: number, currency: Price['currency']) =>
	({ price: { amount, currency } }) as Order['payments'][number];

describe('coversPayment', () => {
	exchangeRate.set({ SAT: SATOSHIS_PER_BTC, EUR: 30_000, USD: 30_000 });

	it('accepts the exact amount', () => {
		expect(
			coversPayment(processor(), paymentOf(120, 'EUR'), { amount: 120, currency: 'EUR' })
		).toBe(true);
	});

	it('accepts an overpayment', () => {
		expect(
			coversPayment(processor(), paymentOf(120, 'EUR'), { amount: 130, currency: 'EUR' })
		).toBe(true);
	});

	it('refuses a shortfall beyond one currency unit', () => {
		expect(
			coversPayment(processor(), paymentOf(120, 'EUR'), { amount: 119, currency: 'EUR' })
		).toBe(false);
	});

	it('absorbs a rounding-sized shortfall', () => {
		expect(
			coversPayment(processor(), paymentOf(120, 'EUR'), { amount: 119.99, currency: 'EUR' })
		).toBe(true);
	});

	it('compares in the payment currency when the provider settles in another', () => {
		// 0.004 BTC is 120 EUR at the pinned rate.
		expect(
			coversPayment(processor(), paymentOf(120, 'EUR'), { amount: 0.004, currency: 'BTC' })
		).toBe(true);
		expect(
			coversPayment(processor(), paymentOf(120, 'EUR'), { amount: 0.003, currency: 'BTC' })
		).toBe(false);
	});

	it('honours a tolerance the processor widens', () => {
		const lenient = processor({ underpaymentTolerance: () => 10 });

		expect(coversPayment(lenient, paymentOf(120, 'EUR'), { amount: 111, currency: 'EUR' })).toBe(
			true
		);
		expect(coversPayment(lenient, paymentOf(120, 'EUR'), { amount: 109, currency: 'EUR' })).toBe(
			false
		);
	});

	it('is exact for SAT, whose currency unit is 1', () => {
		expect(
			coversPayment(processor(), paymentOf(400_000, 'SAT'), { amount: 399_998, currency: 'SAT' })
		).toBe(false);
	});
});
