import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order } from '$lib/types/Order';

const find = vi.fn();
vi.mock('$lib/server/database', () => ({
	collections: { orders: { find: (...args: unknown[]) => find(...args) } }
}));

import {
	compareCursors,
	encodeStreamCursor,
	iteratePaidOrderBacklog,
	orderStreamCursor,
	paidOrderFingerprint,
	parseStreamCursor,
	parseStreamSince,
	sseComment,
	sseEvent
} from './paidStream';
import { toPaidOrderDto } from './listPaid';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';

/** Mongo cursor stub: find().sort().limit().toArray() */
function cursorOf(docs: unknown[]) {
	return { sort: () => ({ limit: () => ({ toArray: async () => docs }) }) };
}

function makeOrder(opts: { id: string; updatedAt: string; amount?: number }): Order {
	const amount = opts.amount ?? 100;
	return {
		_id: opts.id,
		number: 1,
		createdAt: new Date('2026-08-01T10:00:00Z'),
		updatedAt: new Date(opts.updatedAt),
		status: 'paid',
		items: [
			{
				product: TEST_DIGITAL_PRODUCT,
				quantity: 1,
				currencySnapshot: {
					main: { price: { amount, currency: 'EUR' } },
					priceReference: { price: { amount, currency: 'EUR' } }
				},
				vatRate: 0
			}
		],
		payments: [
			{
				_id: new ObjectId(),
				status: 'paid',
				method: 'point-of-sale',
				price: { amount, currency: 'EUR' },
				currencySnapshot: {
					main: { price: { amount, currency: 'EUR' } },
					priceReference: { price: { amount, currency: 'EUR' } }
				},
				paidAt: new Date(opts.updatedAt)
			}
		],
		currencySnapshot: {
			main: { totalPrice: { amount, currency: 'EUR' } },
			priceReference: { totalPrice: { amount, currency: 'EUR' } }
		},
		sellerIdentity: null,
		notifications: { paymentStatus: {} },
		user: {},
		locale: 'en'
	} as unknown as Order;
}

describe('stream cursors', () => {
	it('round-trips through the SSE id field', () => {
		const cursor = { ms: 1_735_689_600_000, orderId: '1f0c8e3a-aaaa' };
		expect(parseStreamCursor(encodeStreamCursor(cursor))).toEqual(cursor);
	});

	it('rejects anything it did not issue', () => {
		for (const raw of ['', 'nope', ':abc', '12', '-1:abc', '1.5:abc', '1735689600000:']) {
			expect(parseStreamCursor(raw)).toBeNull();
		}
	});

	it('is derived from updatedAt, not from the random _id', () => {
		const order = makeOrder({ id: 'zzz', updatedAt: '2026-08-01T10:05:00Z' });
		expect(orderStreamCursor(order)).toEqual({
			ms: new Date('2026-08-01T10:05:00Z').getTime(),
			orderId: 'zzz'
		});
	});

	it('orders on the millisecond first and breaks ties on the order id', () => {
		expect(compareCursors({ ms: 1, orderId: 'b' }, { ms: 2, orderId: 'a' })).toBe(-1);
		expect(compareCursors({ ms: 2, orderId: 'a' }, { ms: 1, orderId: 'b' })).toBe(1);
		expect(compareCursors({ ms: 2, orderId: 'a' }, { ms: 2, orderId: 'b' })).toBe(-1);
		expect(compareCursors({ ms: 2, orderId: 'a' }, { ms: 2, orderId: 'a' })).toBe(0);
	});
});

describe('parseStreamSince', () => {
	it('reads since_ts as epoch seconds', () => {
		expect(parseStreamSince('1735689600', undefined)).toEqual({
			date: new Date('2025-01-01T00:00:00Z')
		});
	});

	it('rejects a non-integer or negative since_ts', () => {
		for (const raw of ['1735689600.5', '-1', 'now', '1e9']) {
			const res = parseStreamSince(raw, undefined);
			expect('error' in res && res.error.field).toBe('since_ts');
		}
	});

	it('falls back to the ISO since of the JSON poll, and since_ts wins', () => {
		expect(parseStreamSince(undefined, '2026-08-01T10:00:00Z')).toEqual({
			date: new Date('2026-08-01T10:00:00Z')
		});
		expect(parseStreamSince('0', '2026-08-01T10:00:00Z')).toEqual({ date: new Date(0) });
	});

	it('rejects a malformed ISO since', () => {
		const res = parseStreamSince(undefined, 'yesterday');
		expect('error' in res && res.error.field).toBe('since');
	});

	it('clamps a resume point ahead of the clock, rather than replaying nothing', () => {
		// A till whose clock runs fast would otherwise skip every event until someone fixes it.
		vi.useFakeTimers({ now: new Date('2026-08-27T12:00:00Z') });
		const ahead = Math.floor(new Date('2026-08-28T12:00:00Z').getTime() / 1000);
		expect(parseStreamSince(String(ahead), undefined)).toEqual({
			date: new Date('2026-08-27T12:00:00Z')
		});
		expect(parseStreamSince(undefined, '2026-09-01T00:00:00Z')).toEqual({
			date: new Date('2026-08-27T12:00:00Z')
		});
		vi.useRealTimers();
	});

	it('leaves a resume point in the past exactly where it was', () => {
		vi.useFakeTimers({ now: new Date('2026-08-27T12:00:00Z') });
		expect(parseStreamSince('1735689600', undefined)).toEqual({
			date: new Date('2025-01-01T00:00:00Z')
		});
		vi.useRealTimers();
	});

	it('means "live edge only" when neither is given', () => {
		expect(parseStreamSince(undefined, undefined)).toEqual({ date: null });
		expect(parseStreamSince('', '')).toEqual({ date: null });
	});
});

describe('frame formatting', () => {
	it('emits id: then data: and terminates the frame', () => {
		expect(sseEvent('1:a', { ok: true })).toBe('id: 1:a\ndata: {"ok":true}\n\n');
	});

	it('emits heartbeats as comments a client parser ignores', () => {
		expect(sseComment('heartbeat')).toBe(':heartbeat\n\n');
	});
});

describe('paidOrderFingerprint', () => {
	/** toPaidOrderDto is nullable for unpaid orders; every fixture here is paid. */
	function fingerprintOf(order: Order): string {
		const dto = toPaidOrderDto(order);
		if (!dto) {
			throw new Error('fixture is not a paid order');
		}
		return paidOrderFingerprint(dto);
	}

	it('is stable across a re-delivery of the same paid order', () => {
		const order = makeOrder({ id: 'a', updatedAt: '2026-08-01T10:05:00Z' });
		expect(fingerprintOf(order)).toBe(fingerprintOf(order));
	});

	it('changes when a further payment moves the amount', () => {
		expect(fingerprintOf(makeOrder({ id: 'a', updatedAt: '2026-08-01T10:05:00Z' }))).not.toBe(
			fingerprintOf(makeOrder({ id: 'a', updatedAt: '2026-08-01T10:05:00Z', amount: 250 }))
		);
	});
});

describe('iteratePaidOrderBacklog', () => {
	beforeEach(() => {
		find.mockReset();
	});

	async function drain(opts: Parameters<typeof iteratePaidOrderBacklog>[0]) {
		const out = [];
		for await (const frame of iteratePaidOrderBacklog(opts)) {
			out.push(frame);
		}
		return out;
	}

	it('replays only paid orders, oldest first, from since', async () => {
		find.mockReturnValue(
			cursorOf([
				makeOrder({ id: 'a', updatedAt: '2026-08-01T10:00:00Z' }),
				makeOrder({ id: 'b', updatedAt: '2026-08-01T10:01:00Z' })
			])
		);
		const frames = await drain({ since: new Date('2026-08-01T09:00:00Z'), after: null });
		expect(frames.map((f) => f.order._id)).toEqual(['a', 'b']);
		expect(find.mock.calls[0][0]).toMatchObject({
			'payments.status': 'paid',
			updatedAt: { $gte: new Date('2026-08-01T09:00:00Z') }
		});
	});

	it('skips everything already delivered before the resume cursor', async () => {
		const first = makeOrder({ id: 'a', updatedAt: '2026-08-01T10:00:00Z' });
		const second = makeOrder({ id: 'b', updatedAt: '2026-08-01T10:01:00Z' });
		find.mockReturnValue(cursorOf([first, second]));
		const frames = await drain({ since: null, after: orderStreamCursor(first) });
		expect(frames.map((f) => f.order._id)).toEqual(['b']);
	});

	it('starts from the later of since and the resume cursor', async () => {
		find.mockReturnValue(cursorOf([]));
		await drain({
			since: new Date('2026-08-01T09:00:00Z'),
			after: { ms: new Date('2026-08-01T10:00:00Z').getTime(), orderId: 'a' }
		});
		expect(find.mock.calls[0][0]).toMatchObject({
			updatedAt: { $gte: new Date('2026-08-01T10:00:00Z') }
		});
	});

	it('stops on a short batch instead of re-querying forever', async () => {
		find.mockReturnValue(cursorOf([makeOrder({ id: 'a', updatedAt: '2026-08-01T10:00:00Z' })]));
		await drain({ since: new Date(0), after: null });
		expect(find).toHaveBeenCalledTimes(1);
	});
});
