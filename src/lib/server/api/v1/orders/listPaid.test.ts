import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order } from '$lib/types/Order';
import { exchangeRate } from '$lib/stores/exchangeRate';

const find = vi.fn();
vi.mock('$lib/server/database', () => ({
	collections: { orders: { find: (...args: unknown[]) => find(...args) } }
}));

import { listPaidOrders, toPaidOrderDto } from './listPaid';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';

/** Mongo cursor stub: find().sort().limit().toArray() */
function cursorOf(docs: unknown[]) {
	return { sort: () => ({ limit: () => ({ toArray: async () => docs }) }) };
}

function makeOrder(opts: { paid: boolean; uniqueKey?: string }): Order {
	const amount = 100;
	return {
		_id: 'ord_test',
		number: 1,
		createdAt: new Date('2026-08-01T10:00:00Z'),
		updatedAt: new Date('2026-08-01T10:05:00Z'),
		status: opts.paid ? 'paid' : 'pending',
		items: [
			{
				product: TEST_DIGITAL_PRODUCT,
				quantity: 1,
				uniqueKey: opts.uniqueKey,
				currencySnapshot: {
					main: { price: { amount, currency: 'EUR' } },
					priceReference: { price: { amount, currency: 'EUR' } }
				},
				vatRate: 0
			}
		],
		payments: opts.paid
			? [
					{
						_id: new ObjectId(),
						status: 'paid',
						method: 'point-of-sale',
						price: { amount, currency: 'EUR' },
						currencySnapshot: {
							main: { price: { amount, currency: 'EUR' } },
							priceReference: { price: { amount, currency: 'EUR' } }
						},
						paidAt: new Date('2026-08-01T10:05:00Z')
					}
			  ]
			: [
					{
						_id: new ObjectId(),
						status: 'pending',
						method: 'point-of-sale',
						price: { amount, currency: 'EUR' },
						currencySnapshot: {
							main: { price: { amount, currency: 'EUR' } },
							priceReference: { price: { amount, currency: 'EUR' } }
						}
					}
			  ],
		currencySnapshot: {
			main: {
				totalPrice: { amount, currency: 'EUR' },
				totalReceived: { amount: 0, currency: 'EUR' }
			},
			priceReference: {
				totalPrice: { amount, currency: 'EUR' },
				totalReceived: { amount: 0, currency: 'EUR' }
			}
		}
	} as unknown as Order;
}

describe('toPaidOrderDto', () => {
	it('returns null for unpaid orders (fail-closed)', () => {
		expect(toPaidOrderDto(makeOrder({ paid: false }))).toBeNull();
	});

	it('includes product lines, uniqueKey, and amount actually paid', () => {
		const dto = toPaidOrderDto(makeOrder({ paid: true, uniqueKey: 'kfdjsfeaz12845ND9xezj91820' }));
		expect(dto).not.toBeNull();
		expect(dto?.amountPaid).toEqual({ amountMinor: 10000, currency: 'EUR' });
		expect(dto?.items[0].uniqueKey).toBe('kfdjsfeaz12845ND9xezj91820');
		expect(dto?.items[0].productId).toBe(TEST_DIGITAL_PRODUCT._id);
	});
});

describe('toOrderReadDto', () => {
	it('includes unpaid orders with zero amountPaid', async () => {
		const { toOrderReadDto } = await import('./listPaid');
		const dto = toOrderReadDto(makeOrder({ paid: false }));
		expect(dto.status).toBe('pending');
		expect(dto.amountPaid).toEqual({ amountMinor: 0, currency: 'EUR' });
		expect(dto.paidAt).toBeNull();
	});
});

describe('paidAmount currency conversion', () => {
	beforeEach(() => {
		exchangeRate.set({ BTC: 1, EUR: 30_000, USD: 60_000, CHF: 30_000, SAT: 100_000_000, ZAR: 0 });
	});

	it('converts a payment made in another currency into the order currency', () => {
		const order = makeOrder({ paid: true });
		// 100 USD at 60k USD/BTC is 50 EUR at 30k EUR/BTC.
		order.payments[0].currencySnapshot.main.price = { amount: 100, currency: 'USD' };
		const dto = toPaidOrderDto(order);
		expect(dto?.amountPaid).toEqual({ amountMinor: 5000, currency: 'EUR' });
	});

	it('leaves same-currency payments untouched', () => {
		const dto = toPaidOrderDto(makeOrder({ paid: true }));
		expect(dto?.amountPaid).toEqual({ amountMinor: 10000, currency: 'EUR' });
	});
});

describe('listPaidOrders pagination', () => {
	beforeEach(() => {
		find.mockReset();
	});

	it('derives hasMore from the query result, not from the mapped rows', async () => {
		// limit 2 over-fetches 3; the middle row is unmappable and gets dropped.
		const page = [
			{ ...makeOrder({ paid: true }), _id: 'ord_c' },
			{ ...makeOrder({ paid: false }), _id: 'ord_b' },
			{ ...makeOrder({ paid: true }), _id: 'ord_a' }
		];
		find.mockReturnValue(cursorOf(page));

		const res = await listPaidOrders({ limit: '2' });
		// One row dropped, so a single order comes back — but a third row exists behind it and
		// the cursor must still advance, otherwise the poller stops with orders unread.
		expect(res.orders).toHaveLength(1);
		expect(res.page.nextCursor).toBe('ord_b');
	});

	it('closes the page when the query returns no extra row', async () => {
		find.mockReturnValue(cursorOf([{ ...makeOrder({ paid: true }), _id: 'ord_c' }]));
		const res = await listPaidOrders({ limit: '2' });
		expect(res.orders).toHaveLength(1);
		expect(res.page.nextCursor).toBeNull();
	});
});
