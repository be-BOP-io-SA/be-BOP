import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order } from '$lib/types/Order';

const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const backlog = vi.fn();
const paidSubscribers = new Set<(order: Order) => void>();
const allSubscribers = new Set<(order: Order) => void>();

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
		paidSubscribers.add(listener);
		return () => paidSubscribers.delete(listener);
	},
	subscribeToAllOrders: (listener: (order: Order) => void) => {
		allSubscribers.add(listener);
		return () => allSubscribers.delete(listener);
	}
}));
vi.mock('$lib/server/api/v1/orders/paidStream', async () => {
	const actual = await vi.importActual<typeof import('$lib/server/api/v1/orders/paidStream')>(
		'$lib/server/api/v1/orders/paidStream'
	);
	return { ...actual, iteratePaidOrderBacklog: (...args: unknown[]) => backlog(...args) };
});

import { GET } from './+server';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';

const keyId = new ObjectId();

/** An order with no paid payment — the very thing the paid feed never announces. */
function makeOrder(opts: { id: string; status: Order['status']; paymentStatus: string }): Order {
	return {
		_id: opts.id,
		number: 7,
		createdAt: new Date('2026-09-21T10:00:00Z'),
		updatedAt: new Date('2026-09-21T10:05:00Z'),
		status: opts.status,
		items: [
			{
				product: TEST_DIGITAL_PRODUCT,
				quantity: 1,
				currencySnapshot: {
					main: { price: { amount: 4, currency: 'CHF' } },
					priceReference: { price: { amount: 4, currency: 'CHF' } }
				},
				vatRate: 0
			}
		],
		payments: [
			{
				_id: new ObjectId(),
				status: opts.paymentStatus,
				method: 'point-of-sale',
				price: { amount: 4, currency: 'CHF' },
				currencySnapshot: {
					main: { price: { amount: 4, currency: 'CHF' } },
					priceReference: { price: { amount: 4, currency: 'CHF' } }
				}
			}
		],
		currencySnapshot: {
			main: { totalPrice: { amount: 4, currency: 'CHF' } },
			priceReference: { totalPrice: { amount: 4, currency: 'CHF' } }
		},
		sellerIdentity: null,
		notifications: { paymentStatus: {} },
		user: {},
		locale: 'en'
	} as unknown as Order;
}

const openConnections: AbortController[] = [];

function call(opts?: { query?: string; withKey?: boolean }) {
	const controller = new AbortController();
	openConnections.push(controller);
	const url = `http://localhost/api/v1/orders/stream${opts?.query ?? ''}`;
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
		request: new Request(url, { method: 'GET', headers: new Headers(), signal: controller.signal }),
		url: new URL(url),
		locals
	} as unknown as Parameters<typeof GET>[0]);
}

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

describe('GET /api/v1/orders/stream', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		backlog.mockReset();
		backlog.mockImplementation(() => nothing());
		paidSubscribers.clear();
		allSubscribers.clear();
		requireApiKey.mockImplementation(async (event: { locals: { apiKey?: unknown } }) => {
			if (!event.locals.apiKey) {
				const { apiError } = await import('$lib/server/api/v1/errors');
				return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
			}
			return event.locals.apiKey;
		});
	});

	afterEach(() => {
		for (const controller of openConnections.splice(0)) {
			controller.abort();
		}
	});

	it('requires orders:stream', async () => {
		await call();
		expect(requireApiKey.mock.calls[0][1]).toBe('orders:stream');
	});

	it('401s without an API key', async () => {
		expect((await call({ withKey: false })).status).toBe(401);
	});

	it('follows every order, not only the paid ones', async () => {
		await call();
		expect(allSubscribers.size).toBe(1);
		expect(paidSubscribers.size).toBe(0);
	});

	it('announces an order whose payment is still pending', async () => {
		const res = await call();
		await readFrames(res, 2);
		for (const listener of allSubscribers) {
			listener(makeOrder({ id: 'ord-pending', status: 'pending', paymentStatus: 'pending' }));
		}

		const [frame] = await readFrames(res, 1);
		expect(frame).toContain('"orderId":"ord-pending"');
		expect(frame).toContain('"status":"pending"');
	});

	it('announces an order whose payment failed', async () => {
		const res = await call();
		await readFrames(res, 2);
		for (const listener of allSubscribers) {
			listener(makeOrder({ id: 'ord-failed', status: 'failed', paymentStatus: 'failed' }));
		}

		const [frame] = await readFrames(res, 1);
		expect(frame).toContain('"orderId":"ord-failed"');
		expect(frame).toContain('"status":"failed"');
	});

	it('re-announces an order that moved from pending to failed', async () => {
		const res = await call();
		await readFrames(res, 2);
		for (const listener of allSubscribers) {
			listener(makeOrder({ id: 'ord-x', status: 'pending', paymentStatus: 'pending' }));
			listener(makeOrder({ id: 'ord-x', status: 'failed', paymentStatus: 'failed' }));
		}

		const frames = await readFrames(res, 2);
		expect(frames).toHaveLength(2);
		expect(frames[1]).toContain('"status":"failed"');
	});

	it('replays the backlog without the paid filter', async () => {
		// The backfill only starts once the preamble is out, and it yields nothing here: asking for
		// one frame more than the stream will ever send waits for it instead of racing it.
		const res = await call({ query: '?since_ts=1735689600' });
		await readFrames(res, 3);

		expect(backlog).toHaveBeenCalledWith({
			since: new Date('2025-01-01T00:00:00Z'),
			after: null,
			anyStatus: true
		});
	});

	it('rejects a since_ts that is not epoch seconds', async () => {
		const res = await call({ query: '?since_ts=yesterday' });
		expect(res.status).toBe(400);
	});
});
