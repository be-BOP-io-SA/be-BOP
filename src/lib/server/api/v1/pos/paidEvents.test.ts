import { describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order } from '$lib/types/Order';

vi.mock('$lib/server/database', () => ({ collections: {} }));

import { toPosPaidOrderEvent } from './paidEvents';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';

function makeOrder(opts?: {
	paid?: boolean;
	amount?: number;
	tagIds?: string[];
	uniqueKey?: string;
	extraLine?: boolean;
}): Order {
	const amount = opts?.amount ?? 20;
	const paid = opts?.paid ?? true;
	return {
		_id: '3f2a0c',
		number: 1,
		createdAt: new Date('2026-07-29T14:03:00Z'),
		updatedAt: new Date('2026-07-29T14:03:10Z'),
		status: paid ? 'paid' : 'pending',
		items: [
			{
				product: { ...TEST_DIGITAL_PRODUCT, _id: 'credit', tagIds: opts?.tagIds },
				quantity: 1,
				...(opts?.uniqueKey && { uniqueKey: opts.uniqueKey }),
				currencySnapshot: {
					main: { price: { amount, currency: 'CHF' } },
					priceReference: { price: { amount, currency: 'CHF' } }
				},
				vatRate: 0
			},
			...(opts?.extraLine
				? [
						{
							product: { ...TEST_DIGITAL_PRODUCT, _id: 'biere', tagIds: ['boissons'] },
							quantity: 2,
							currencySnapshot: {
								main: { price: { amount: 5, currency: 'CHF' } },
								priceReference: { price: { amount: 5, currency: 'CHF' } }
							},
							vatRate: 0
						}
				  ]
				: [])
		],
		payments: [
			{
				_id: new ObjectId(),
				status: paid ? 'paid' : 'pending',
				method: 'point-of-sale',
				price: { amount, currency: 'CHF' },
				currencySnapshot: {
					main: { price: { amount, currency: 'CHF' } },
					priceReference: { price: { amount, currency: 'CHF' } }
				},
				paidAt: paid ? new Date('2026-07-29T14:03:05Z') : undefined
			}
		],
		currencySnapshot: {
			main: { totalPrice: { amount, currency: 'CHF' } },
			priceReference: { totalPrice: { amount, currency: 'CHF' } }
		},
		sellerIdentity: null,
		notifications: { paymentStatus: {} },
		user: {},
		locale: 'en'
	} as unknown as Order;
}

describe('toPosPaidOrderEvent', () => {
	it('carries the order id and the amount in major units', () => {
		expect(toPosPaidOrderEvent(makeOrder({ amount: 20 }))).toEqual({
			orderId: '3f2a0c',
			amount: { amount: 20, currency: 'CHF' }
		});
	});

	it('carries nothing else — no order is flagged as belonging to an integration', () => {
		expect(Object.keys(toPosPaidOrderEvent(makeOrder()) ?? {})).toEqual(['orderId', 'amount']);
	});

	it('is null for an order with nothing actually received', () => {
		expect(toPosPaidOrderEvent(makeOrder({ paid: false }))).toBeNull();
	});
});

describe('toPosPaidOrderEvent with a tag', () => {
	it('ignores an order with no line carrying the tag', () => {
		expect(toPosPaidOrderEvent(makeOrder({ tagIds: ['boissons'] }), 'recharge')).toBeNull();
	});

	it('announces an order whose line carries the tag', () => {
		const event = toPosPaidOrderEvent(makeOrder({ tagIds: ['recharge'], amount: 20 }), 'recharge');
		expect(event).toMatchObject({ orderId: '3f2a0c', amount: { amount: 20, currency: 'CHF' } });
	});

	it('reports the tagged line alone, not the basket it was bought with', () => {
		// 20 of credit plus 2 beers at 5: the order total is 30, the line is 20.
		const event = toPosPaidOrderEvent(
			makeOrder({ tagIds: ['recharge'], amount: 20, extraLine: true }),
			'recharge'
		);
		expect(event?.amount.amount).toBe(20);
	});

	it('carries the storefront key, which is how the support is identified', () => {
		const event = toPosPaidOrderEvent(
			makeOrder({ tagIds: ['recharge'], uniqueKey: '3Qz8yTaVbNk7' }),
			'recharge'
		);
		expect(event?.key).toBe('3Qz8yTaVbNk7');
	});

	it('stays silent on an order carrying two tagged lines rather than crediting one at random', () => {
		const ambiguous = makeOrder({ tagIds: ['recharge'] });
		ambiguous.items.push({ ...ambiguous.items[0], product: { ...ambiguous.items[0].product } });
		expect(toPosPaidOrderEvent(ambiguous, 'recharge')).toBeNull();
	});

	it('still announces the whole order when no tag is named', () => {
		const event = toPosPaidOrderEvent(
			makeOrder({ tagIds: ['recharge'], amount: 20, extraLine: true })
		);
		expect(event?.amount.amount).toBe(20);
		expect(event).not.toHaveProperty('key');
	});
});
