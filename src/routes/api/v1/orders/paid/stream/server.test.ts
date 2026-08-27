import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order } from '$lib/types/Order';

const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const backlog = vi.fn();
const subscribers = new Set<(order: Order) => void>();

vi.mock('$lib/server/api/v1/auth', () => ({
	requireApiKey: (...args: unknown[]) => requireApiKey(...args)
}));
vi.mock('$lib/server/rateLimit', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimit(...args)
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { apiV1: { corsOrigins: [] } }
}));
vi.mock('$lib/server/database', () => ({ collections: { orders: { find: vi.fn() } } }));
vi.mock('$lib/server/api/v1/orders/paidStreamHub', () => ({
	subscribeToPaidOrders: (listener: (order: Order) => void) => {
		subscribers.add(listener);
		return () => subscribers.delete(listener);
	}
}));
vi.mock('$lib/server/api/v1/orders/paidStream', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/api/v1/orders/paidStream')>(
		'$lib/server/api/v1/orders/paidStream'
	);
	return { ...actual, iteratePaidOrderBacklog: (...args: unknown[]) => backlog(...args) };
});

import { GET } from './+server';
import { orderStreamCursor } from '$lib/server/api/v1/orders/paidStream';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';

const keyId = new ObjectId();

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

const openConnections: AbortController[] = [];

function call(opts?: { query?: string; lastEventId?: string; withKey?: boolean }) {
	const controller = new AbortController();
	openConnections.push(controller);
	const headers = new Headers();
	if (opts?.lastEventId) {
		headers.set('last-event-id', opts.lastEventId);
	}
	const url = `http://localhost/api/v1/orders/paid/stream${opts?.query ?? ''}`;
	const locals =
		opts?.withKey === false
			? {}
			: {
					apiKey: {
						_id: keyId,
						name: 't',
						scopes: ['orders:stream'] as const,
						keyPrefix: 'bebop_ak_test_abcd1234'
					}
			  };
	return GET({
		request: new Request(url, { method: 'GET', headers, signal: controller.signal }),
		url: new URL(url),
		locals
	} as unknown as Parameters<typeof GET>[0]);
}

/** Read frames until `count` arrive or the stream goes quiet. Never hangs the suite. */
async function readFrames(res: Response, count: number): Promise<string[]> {
	const body = res.body;
	if (!body) {
		throw new Error('stream response has no body');
	}
	const reader = body.getReader();
	const decoder = new TextDecoder();
	const frames: string[] = [];
	let buffer = '';
	while (frames.length < count) {
		const chunk = await Promise.race([
			reader.read(),
			new Promise<{ done: true; value: undefined }>((resolve) =>
				setTimeout(() => resolve({ done: true, value: undefined }), 250)
			)
		]);
		if (chunk.done) {
			break;
		}
		buffer += decoder.decode(chunk.value, { stream: true });
		let index = buffer.indexOf('\n\n');
		while (index !== -1) {
			frames.push(buffer.slice(0, index));
			buffer = buffer.slice(index + 2);
			index = buffer.indexOf('\n\n');
		}
	}
	reader.releaseLock();
	return frames;
}

async function* nothing() {}

describe('GET /api/v1/orders/paid/stream', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		backlog.mockReset();
		backlog.mockImplementation(() => nothing());
		subscribers.clear();
		requireApiKey.mockImplementation(async (event: { locals: { apiKey?: unknown } }) => {
			if (!event.locals.apiKey) {
				const { apiError } = await import('$lib/server/api/v1/errors');
				return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
			}
			return event.locals.apiKey;
		});
	});

	afterEach(() => {
		// Aborting releases the per-key connection slot, the heartbeat interval and the subscription.
		for (const controller of openConnections.splice(0)) {
			controller.abort();
		}
	});

	it('requires orders:stream, not the poll scope', async () => {
		await call();
		expect(requireApiKey.mock.calls[0][1]).toBe('orders:stream');
	});

	it('401s without an API key', async () => {
		const res = await call({ withKey: false });
		expect(res.status).toBe(401);
	});

	it('opens an event stream that proxies must not buffer', async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toMatch(/^text\/event-stream/);
		expect(res.headers.get('cache-control')).toMatch(/no-transform/);
		expect(res.headers.get('x-accel-buffering')).toBe('no');
	});

	it('opens with a retry hint and a comment so the connection flushes', async () => {
		const res = await call();
		const frames = await readFrames(res, 2);
		expect(frames[0]).toBe('retry: 5000');
		expect(frames[1]).toBe(':ok');
	});

	it('rejects a since_ts that is not epoch seconds', async () => {
		const res = await call({ query: '?since_ts=yesterday' });
		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'VALIDATION_ERROR', details: { field: 'since_ts' } }
		});
	});

	it('rejects a Last-Event-ID it never issued', async () => {
		const res = await call({ lastEventId: 'not-a-cursor' });
		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({
			error: { details: { field: 'Last-Event-ID' } }
		});
	});

	it('replays the backlog from since_ts, framed as id: then data:', async () => {
		const order = makeOrder({ id: 'ord-a', updatedAt: '2026-08-01T10:05:00Z' });
		backlog.mockImplementation(async function* () {
			yield { cursor: orderStreamCursor(order), order };
		});
		const res = await call({ query: '?since_ts=1735689600' });
		const frames = await readFrames(res, 3);
		expect(backlog).toHaveBeenCalledWith({
			since: new Date('2025-01-01T00:00:00Z'),
			after: null
		});
		const [id, data] = frames[2].split('\n');
		expect(id).toBe(`id: ${new Date('2026-08-01T10:05:00Z').getTime()}:ord-a`);
		expect(JSON.parse(data.slice('data: '.length))).toMatchObject({ orderId: 'ord-a' });
	});

	it('resumes from Last-Event-ID without needing since_ts', async () => {
		const res = await call({ lastEventId: '1735689600000:ord-a' });
		// One frame past the preamble: the backfill only starts once `retry:` and `:ok` are out.
		await readFrames(res, 3);
		expect(backlog).toHaveBeenCalledWith({
			since: null,
			after: { ms: 1735689600000, orderId: 'ord-a' }
		});
	});

	it('does not replay anything when neither since_ts nor Last-Event-ID is given', async () => {
		const res = await call();
		await readFrames(res, 3);
		expect(backlog).not.toHaveBeenCalled();
	});

	it('pushes an order that gets paid while the stream is open', async () => {
		const res = await call();
		await readFrames(res, 2);
		const order = makeOrder({ id: 'ord-live', updatedAt: '2026-08-01T11:00:00Z' });
		for (const listener of subscribers) {
			listener(order);
		}
		const frames = await readFrames(res, 1);
		expect(frames[0]).toContain('id: ');
		expect(frames[0]).toContain('"orderId":"ord-live"');
	});

	it('suppresses a re-delivery of an unchanged paid order', async () => {
		const res = await call();
		await readFrames(res, 2);
		const order = makeOrder({ id: 'ord-live', updatedAt: '2026-08-01T11:00:00Z' });
		for (const listener of subscribers) {
			listener(order);
			listener(order);
		}
		const frames = await readFrames(res, 2);
		expect(frames).toHaveLength(1);
	});

	it('still pushes when a further payment changes the amount', async () => {
		const res = await call();
		await readFrames(res, 2);
		for (const listener of subscribers) {
			listener(makeOrder({ id: 'ord-live', updatedAt: '2026-08-01T11:00:00Z' }));
			listener(makeOrder({ id: 'ord-live', updatedAt: '2026-08-01T11:01:00Z', amount: 250 }));
		}
		const frames = await readFrames(res, 2);
		expect(frames).toHaveLength(2);
	});

	it('429s past the concurrent stream budget for one API key', async () => {
		for (let i = 0; i < 4; i++) {
			expect((await call()).status).toBe(200);
		}
		const res = await call();
		expect(res.status).toBe(429);
		expect(res.headers.get('Retry-After')).toBeTruthy();
	});

	it('frees the slot when a stream is aborted', async () => {
		for (let i = 0; i < 4; i++) {
			await call();
		}
		openConnections.pop()?.abort();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect((await call()).status).toBe(200);
	});

	it('429s when the API key is rate limited', async () => {
		checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 7 });
		const res = await call();
		expect(res.status).toBe(429);
		expect(res.headers.get('Retry-After')).toBe('7');
	});
});
