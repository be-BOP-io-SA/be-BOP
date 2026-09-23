import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order } from '$lib/types/Order';
import { resetStreamBudget } from '$lib/server/api/v1/orders/paidStreamConnection';

/** Small enough to fill in a test, and nothing is compiled in any more: the key carries it. */
const BUDGET = 3;

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

function call(opts?: {
	query?: string;
	lastEventId?: string;
	withKey?: boolean;
	/** Left out means no ceiling, which is what a key with nothing configured gets. */
	maxConcurrentStreams?: number;
	lifetimeSeconds?: number;
}) {
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
						keyPrefix: 'bebop_ak_test_abcd1234',
						maxConcurrentStreams: opts?.maxConcurrentStreams,
						streamLifetimeSeconds: opts?.lifetimeSeconds
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
		// The count lives in the module, not in the test: one test must not seat the next one.
		resetStreamBudget(keyId.toString());
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

	it('announces a note added to an order the backfill had already replayed', async () => {
		// The terminal was offline, catches up with since_ts, and is waiting to hear that a top-up
		// bought on the shop has been resolved at another stand. Nothing but the note changes: same
		// amount, same currency, same paid-at, same lines.
		const order = makeOrder({ id: 'ord-a', updatedAt: '2026-08-01T10:05:00Z' });
		backlog.mockImplementation(async function* () {
			yield { cursor: orderStreamCursor(order), order };
		});

		const res = await call({ query: '?since_ts=1735689600' });
		const replayed = await readFrames(res, 3);
		expect(replayed[2]).toContain('"orderId":"ord-a"');

		const annotated = {
			...order,
			updatedAt: new Date('2026-08-01T10:07:00Z'),
			notes: [
				{
					content: 'Resolved into bracelet 42',
					createdAt: new Date('2026-08-01T10:07:00Z'),
					role: 'super-admin',
					userAlias: 'externalPartner'
				}
			]
		} as unknown as Order;
		for (const listener of subscribers) {
			listener(annotated);
		}

		const frames = await readFrames(res, 1);
		expect(frames).toHaveLength(1);
		expect(frames[0]).toContain('"orderId":"ord-a"');
		expect(frames[0]).toContain('Resolved into bracelet 42');
	});

	it('429s past the budget the key itself carries', async () => {
		for (let i = 0; i < BUDGET; i++) {
			expect((await call({ maxConcurrentStreams: BUDGET })).status).toBe(200);
		}
		const res = await call({ maxConcurrentStreams: BUDGET });
		expect(res.status).toBe(429);
		expect(res.headers.get('Retry-After')).toBeTruthy();
	});

	it('lets a key with no budget configured open as many as it likes', async () => {
		for (let i = 0; i < BUDGET * 4; i++) {
			expect((await call()).status).toBe(200);
		}
	});

	it('does not spend a place on a stream it refuses', async () => {
		for (let i = 0; i < BUDGET; i++) {
			await call({ maxConcurrentStreams: BUDGET });
		}
		// Ten refusals in a row: were a refusal to take a place, freeing one would not be enough.
		for (let i = 0; i < 10; i++) {
			expect((await call({ maxConcurrentStreams: BUDGET })).status).toBe(429);
		}
		openConnections.shift()?.abort();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect((await call({ maxConcurrentStreams: BUDGET })).status).toBe(200);
	});

	it('frees the slot when a stream is aborted', async () => {
		for (let i = 0; i < BUDGET; i++) {
			await call({ maxConcurrentStreams: BUDGET });
		}
		openConnections.pop()?.abort();
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect((await call({ maxConcurrentStreams: BUDGET })).status).toBe(200);
	});

	it('frees the slot once the stream reaches its lifetime', async () => {
		for (let i = 0; i < BUDGET; i++) {
			expect((await call({ maxConcurrentStreams: BUDGET, lifetimeSeconds: 1 })).status).toBe(200);
		}
		expect((await call({ maxConcurrentStreams: BUDGET })).status).toBe(429);
		await new Promise((resolve) => setTimeout(resolve, 1_200));
		expect((await call({ maxConcurrentStreams: BUDGET })).status).toBe(200);
	});

	it('hands every place of a key back at once', async () => {
		for (let i = 0; i < BUDGET; i++) {
			await call({ maxConcurrentStreams: BUDGET });
		}
		expect((await call({ maxConcurrentStreams: BUDGET })).status).toBe(429);

		resetStreamBudget(keyId.toString());

		for (let i = 0; i < BUDGET; i++) {
			expect((await call({ maxConcurrentStreams: BUDGET })).status).toBe(200);
		}
	});

	it('429s when the API key is rate limited', async () => {
		checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 7 });
		const res = await call();
		expect(res.status).toBe(429);
		expect(res.headers.get('Retry-After')).toBe('7');
	});
});
