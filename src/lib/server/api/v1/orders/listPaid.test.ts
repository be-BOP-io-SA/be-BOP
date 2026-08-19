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

/** listPaidOrders returns a query error instead of throwing; most tests want the success branch. */
async function listPaidOk(query: Parameters<typeof listPaidOrders>[0] = {}) {
	const res = await listPaidOrders(query);
	if ('error' in res) {
		throw new Error(`unexpected query error on ${res.error.field}: ${res.error.message}`);
	}
	return res;
}

/** The filter Mongo was actually asked for on the last find() call. */
function lastFilter(): Record<string, unknown> {
	return find.mock.calls[find.mock.calls.length - 1][0] as Record<string, unknown>;
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

		const res = await listPaidOk({ limit: '2' });
		// One row dropped, so a single order comes back — but a third row exists behind it and
		// the cursor must still advance, otherwise the poller stops with orders unread.
		expect(res.orders).toHaveLength(1);
		expect(res.page.nextCursor).toBe('ord_b');
	});

	it('closes the page when the query returns no extra row', async () => {
		find.mockReturnValue(cursorOf([{ ...makeOrder({ paid: true }), _id: 'ord_c' }]));
		const res = await listPaidOk({ limit: '2' });
		expect(res.orders).toHaveLength(1);
		expect(res.page.nextCursor).toBeNull();
	});
});

describe('order filters', () => {
	beforeEach(() => {
		find.mockReset();
		find.mockReturnValue(cursorOf([]));
	});

	it('filters on the product line, not on a top-level field', async () => {
		await listPaidOk({ productId: 'cafe' });
		expect(lastFilter()['items.product._id']).toBe('cafe');
	});

	it('keeps the paid constraint alongside any filter', async () => {
		await listPaidOk({ productId: 'cafe' });
		expect(lastFilter()['payments.status']).toBe('paid');
	});

	it('accepts a known order status', async () => {
		await listPaidOk({ status: 'pending' });
		expect(lastFilter().status).toBe('pending');
	});

	it('rejects an unknown status instead of ignoring it', async () => {
		const res = await listPaidOrders({ status: 'shipped' });
		expect('error' in res && res.error.field).toBe('status');
		expect(find).not.toHaveBeenCalled();
	});

	it('coerces number and rejects anything that is not a positive integer', async () => {
		await listPaidOk({ number: '42' });
		expect(lastFilter().number).toBe(42);

		for (const bad of ['0', '-1', '1.5', '12abc', 'abc']) {
			const res = await listPaidOrders({ number: bad });
			expect('error' in res && res.error.field).toBe('number');
		}
	});

	it('scopes externalOrderId to the calling key', async () => {
		const apiKeyId = new ObjectId();
		await listPaidOk({ externalOrderId: 'pos-1', apiKeyId });
		expect(lastFilter().externalOrderId).toBe('pos-1');
		expect(lastFilter().externalSourceApiKeyId).toBe(apiKeyId);
	});

	it('refuses an externalOrderId lookup with no key rather than searching across keys', async () => {
		const res = await listPaidOrders({ externalOrderId: 'pos-1' });
		expect('error' in res && res.error.field).toBe('externalOrderId');
		expect(find).not.toHaveBeenCalled();
	});

	it('filters on order labels', async () => {
		await listPaidOk({ label: 'vip' });
		expect(lastFilter().orderLabelIds).toBe('vip');
	});

	it('combines a filter with the cursor and the date window', async () => {
		await listPaidOk({
			productId: 'cafe',
			cursor: 'ord_b',
			since: '2026-08-01T00:00:00Z'
		});
		const filter = lastFilter();
		expect(filter['items.product._id']).toBe('cafe');
		expect(filter._id).toEqual({ $lt: 'ord_b' });
		expect(filter.createdAt).toEqual({ $gte: new Date('2026-08-01T00:00:00Z') });
	});

	it('applies no filter when none is given', async () => {
		await listPaidOk({});
		expect(Object.keys(lastFilter())).toEqual(['payments.status']);
	});
});

describe('toItemDto discounts', () => {
	it('reports the discounted unit price, not the raw snapshot price', () => {
		const order = makeOrder({ paid: true });
		order.items[0].discountPercentage = 25;
		const dto = toPaidOrderDto(order);
		// 100 EUR snapshot, 25% off -> 75 EUR per unit.
		expect(dto?.items[0].unitPrice).toEqual({ amountMinor: 7500, currency: 'EUR' });
	});

	it('exposes freeQuantity so charged units can be derived, and omits it when zero', () => {
		const order = makeOrder({ paid: true });
		order.items[0].quantity = 3;
		order.items[0].freeQuantity = 1;
		const dto = toPaidOrderDto(order);
		expect(dto?.items[0].quantity).toBe(3);
		expect(dto?.items[0].freeQuantity).toBe(1);

		expect(toPaidOrderDto(makeOrder({ paid: true }))?.items[0].freeQuantity).toBeUndefined();
	});
});
