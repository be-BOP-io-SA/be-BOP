import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import type { OrderPayment } from '$lib/types/Order';
import { matchPayloadPayment, shouldAddUnmatchedPayment } from './matchPayments';
import type { OrderPaymentWrite } from '$lib/server/api/v1/schemas/orders-write';

function op(opts: {
	amount: number;
	currency?: 'EUR';
	method?: OrderPayment['method'];
	externalPaymentId?: string;
}): OrderPayment {
	const currency = opts.currency ?? 'EUR';
	const method = opts.method ?? 'point-of-sale';
	return {
		_id: new ObjectId(),
		status: 'pending',
		method,
		price: { amount: opts.amount, currency },
		currencySnapshot: {
			main: { price: { amount: opts.amount, currency } },
			priceReference: { price: { amount: opts.amount, currency } }
		},
		...(opts.externalPaymentId && { externalPaymentId: opts.externalPaymentId })
	};
}

function payload(partial: Partial<OrderPaymentWrite> & { amountMinor: number }): OrderPaymentWrite {
	return {
		method: 'point-of-sale',
		status: 'paid',
		currency: 'EUR',
		...partial
	};
}

describe('matchPayloadPayment', () => {
	it('matches by externalPaymentId even when amounts/indexes differ', () => {
		const payments = [
			op({ amount: 1, externalPaymentId: 'a' }),
			op({ amount: 2, externalPaymentId: 'b' })
		];
		const used = new Set<number>();
		const m0 = matchPayloadPayment(
			payments,
			payload({ amountMinor: 200, externalPaymentId: 'b' }),
			0,
			used
		);
		expect(m0).toEqual({ kind: 'existing', orderPaymentIndex: 1 });
		used.add(1);
		const m1 = matchPayloadPayment(
			payments,
			payload({ amountMinor: 100, externalPaymentId: 'a' }),
			1,
			used
		);
		expect(m1).toEqual({ kind: 'existing', orderPaymentIndex: 0 });
	});

	it('falls back to amountMinor+currency+method when ids absent', () => {
		const payments = [op({ amount: 2.5 }), op({ amount: 1.5 })];
		const used = new Set<number>();
		const m0 = matchPayloadPayment(payments, payload({ amountMinor: 150 }), 0, used);
		expect(m0).toEqual({ kind: 'existing', orderPaymentIndex: 1 });
		used.add(1);
		const m1 = matchPayloadPayment(payments, payload({ amountMinor: 250 }), 1, used);
		expect(m1).toEqual({ kind: 'existing', orderPaymentIndex: 0 });
	});

	it('never double-applies the same order payment', () => {
		const payments = [
			op({ amount: 1, externalPaymentId: 'x' }),
			op({ amount: 2, externalPaymentId: 'y' })
		];
		const used = new Set<number>([0]);
		const m = matchPayloadPayment(
			payments,
			payload({ amountMinor: 100, externalPaymentId: 'x' }),
			1,
			used
		);
		// id x already used, amount 100 != y's 200, and index fallback disabled when id present
		expect(m).toEqual({ kind: 'unmatched' });
	});

	it('last-resort uses same index only when payload has no externalPaymentId', () => {
		const payments = [op({ amount: 9 }), op({ amount: 8 })];
		const used = new Set<number>();
		const m = matchPayloadPayment(payments, payload({ amountMinor: 1 }), 0, used);
		expect(m).toEqual({ kind: 'existing', orderPaymentIndex: 0 });
		const mId = matchPayloadPayment(
			payments,
			payload({ amountMinor: 1, externalPaymentId: 'ghost' }),
			0,
			used
		);
		expect(mId).toEqual({ kind: 'unmatched' });
	});

	it('returns unmatched when nothing fits', () => {
		const payments = [op({ amount: 1 })];
		const used = new Set<number>([0]);
		const m = matchPayloadPayment(
			payments,
			payload({ amountMinor: 999, externalPaymentId: 'new' }),
			1,
			used
		);
		expect(m).toEqual({ kind: 'unmatched' });
	});
});

describe('shouldAddUnmatchedPayment', () => {
	it('allows add when pending, remaining > 0, and truly new externalPaymentId', () => {
		expect(
			shouldAddUnmatchedPayment(
				{ status: 'pending', payments: [] },
				payload({ amountMinor: 100, externalPaymentId: 'new-1' }),
				1
			)
		).toBe(true);
	});

	it('rejects add when id already exists on the order (even if previously used in this sync)', () => {
		expect(
			shouldAddUnmatchedPayment(
				{
					status: 'pending',
					payments: [{ externalPaymentId: 'only-a' }, { externalPaymentId: 'only-b' }]
				},
				payload({ amountMinor: 100, externalPaymentId: 'only-a' }),
				1
			)
		).toBe(false);
	});

	it('rejects add without externalPaymentId or when remaining is 0', () => {
		expect(
			shouldAddUnmatchedPayment(
				{ status: 'pending', payments: [] },
				payload({ amountMinor: 100 }),
				1
			)
		).toBe(false);
		expect(
			shouldAddUnmatchedPayment(
				{ status: 'pending', payments: [] },
				payload({ amountMinor: 100, externalPaymentId: 'new-1' }),
				0
			)
		).toBe(false);
		expect(
			shouldAddUnmatchedPayment(
				{ status: 'paid', payments: [] },
				payload({ amountMinor: 100, externalPaymentId: 'new-1' }),
				1
			)
		).toBe(false);
	});
});
