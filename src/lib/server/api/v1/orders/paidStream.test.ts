import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order } from '$lib/types/Order';

const find = vi.fn();
vi.mock('$lib/server/database', () => ({
	collections: { orders: { find: (...args: unknown[]) => find(...args) } }
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { authLinkJwtSigningKey: 'test-signing-key' }
}));

import {
	encodeStreamCursor,
	iteratePaidOrderBacklog,
	orderStreamCursor,
	paidOrderFingerprint,
	parseStreamCursor,
	sseComment,
	sseEvent,
	streamSinceDate
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
	const scope = { keyId: 'key-a', feed: 'paid' } as const;

	it('round-trips through the SSE id field', () => {
		const cursor = { ms: 1_735_689_600_000, orderId: '1f0c8e3a-aaaa' };
		expect(parseStreamCursor(encodeStreamCursor(cursor, scope), scope)).toEqual(cursor);
	});

	it('rejects anything it did not issue', () => {
		for (const raw of ['', 'nope', ':abc', '12', '-1:abc', '1.5:abc', '1735689600000:']) {
			expect(parseStreamCursor(raw, scope)).toBeNull();
		}
	});

	it('rejects a cursor made up by hand, or altered to start earlier', () => {
		const cursor = { ms: 1_735_689_600_000, orderId: '1f0c8e3a-aaaa' };
		const issued = encodeStreamCursor(cursor, scope);
		const signature = issued.slice(issued.lastIndexOf(':') + 1);
		expect(parseStreamCursor('1735689600000:1f0c8e3a-aaaa', scope)).toBeNull();
		expect(parseStreamCursor(`0:1f0c8e3a-aaaa:${signature}`, scope)).toBeNull();
	});

	it('does not resume another key, nor another stream', () => {
		const cursor = { ms: 1_735_689_600_000, orderId: '1f0c8e3a-aaaa' };
		const issued = encodeStreamCursor(cursor, scope);
		expect(parseStreamCursor(issued, { keyId: 'key-b', feed: 'paid' })).toBeNull();
		expect(parseStreamCursor(issued, { keyId: 'key-a', feed: 'all' })).toBeNull();
	});

	it('is derived from updatedAt, not from the random _id', () => {
		const order = makeOrder({ id: 'zzz', updatedAt: '2026-08-01T10:05:00Z' });
		expect(orderStreamCursor(order)).toEqual({
			ms: new Date('2026-08-01T10:05:00Z').getTime(),
			orderId: 'zzz'
		});
	});
});

describe('streamSinceDate', () => {
	it('reads since_ts as epoch seconds', () => {
		expect(streamSinceDate(1735689600)).toEqual(new Date('2025-01-01T00:00:00Z'));
		expect(streamSinceDate(0)).toEqual(new Date(0));
	});

	it('clamps a resume point ahead of the clock, rather than replaying nothing', () => {
		// A till whose clock runs fast would otherwise skip every event until someone fixes it.
		vi.useFakeTimers({ now: new Date('2026-08-27T12:00:00Z') });
		const ahead = Math.floor(new Date('2026-08-28T12:00:00Z').getTime() / 1000);
		expect(streamSinceDate(ahead)).toEqual(new Date('2026-08-27T12:00:00Z'));
		vi.useRealTimers();
	});

	it('leaves a resume point in the past exactly where it was', () => {
		vi.useFakeTimers({ now: new Date('2026-08-27T12:00:00Z') });
		expect(streamSinceDate(1735689600)).toEqual(new Date('2025-01-01T00:00:00Z'));
		vi.useRealTimers();
	});

	it('means "live edge only" when it is not given', () => {
		expect(streamSinceDate(undefined)).toBeNull();
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

	it('asks only for what comes after the resume cursor, by date then by order id', async () => {
		const first = makeOrder({ id: 'a', updatedAt: '2026-08-01T10:00:00Z' });
		find.mockReturnValue(cursorOf([]));
		await drain({ since: null, after: orderStreamCursor(first) });
		expect(find.mock.calls[0][0]).toMatchObject({
			$or: [
				{ updatedAt: { $gt: new Date('2026-08-01T10:00:00Z') } },
				{ updatedAt: new Date('2026-08-01T10:00:00Z'), _id: { $gt: 'a' } }
			]
		});
	});

	it('keeps both since and the resume cursor, so the later of the two applies', async () => {
		find.mockReturnValue(cursorOf([]));
		await drain({
			since: new Date('2026-08-01T09:00:00Z'),
			after: { ms: new Date('2026-08-01T10:00:00Z').getTime(), orderId: 'a' }
		});
		expect(find.mock.calls[0][0]).toMatchObject({
			updatedAt: { $gte: new Date('2026-08-01T09:00:00Z') },
			$or: [
				{ updatedAt: { $gt: new Date('2026-08-01T10:00:00Z') } },
				{ updatedAt: new Date('2026-08-01T10:00:00Z'), _id: { $gt: 'a' } }
			]
		});
	});

	it('stops on a short batch instead of re-querying forever', async () => {
		find.mockReturnValue(cursorOf([makeOrder({ id: 'a', updatedAt: '2026-08-01T10:00:00Z' })]));
		await drain({ since: new Date(0), after: null });
		expect(find).toHaveBeenCalledTimes(1);
	});
});
