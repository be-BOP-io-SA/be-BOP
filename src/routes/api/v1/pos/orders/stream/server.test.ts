import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import type { Order } from '$lib/types/Order';

const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const findOrderCursor = vi.fn();
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
vi.mock('$lib/server/database', () => ({ collections: {} }));
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
	return {
		...actual,
		// Shortened from the real 25s: the assertion is that heartbeats keep coming, not how fast.
		SSE_HEARTBEAT_MS: 20,
		findOrderCursor: (...args: unknown[]) => findOrderCursor(...args),
		iteratePaidOrderBacklog: async function* () {}
	};
});

import { GET } from './+server';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';

const openConnections: AbortController[] = [];

function locals() {
	return {
		apiKey: {
			_id: new ObjectId(),
			name: 't',
			scopes: ['pos:stream'] as const,
			keyPrefix: 'bebop_ak_test_abcd1234'
		},
		clientIp: '203.0.113.50'
	};
}

function paidOrder(opts?: { id?: string; amount?: number }): Order {
	const amount = opts?.amount ?? 20;
	return {
		_id: opts?.id ?? '3f2a0c',
		number: 1,
		createdAt: new Date('2026-07-29T14:03:00Z'),
		updatedAt: new Date('2026-07-29T14:03:10Z'),
		status: 'paid',
		items: [
			{
				product: TEST_DIGITAL_PRODUCT,
				quantity: 1,
				currencySnapshot: {
					main: { price: { amount, currency: 'CHF' } },
					priceReference: { price: { amount, currency: 'CHF' } }
				},
				vatRate: 0
			}
		],
		payments: [
			{
				_id: new ObjectId(),
				status: 'paid',
				method: 'point-of-sale',
				price: { amount, currency: 'CHF' },
				currencySnapshot: {
					main: { price: { amount, currency: 'CHF' } },
					priceReference: { price: { amount, currency: 'CHF' } }
				},
				paidAt: new Date('2026-07-29T14:03:05Z')
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

function callGet(opts?: { query?: string; lastEventId?: string }) {
	const controller = new AbortController();
	openConnections.push(controller);
	const headers = new Headers();
	if (opts?.lastEventId) {
		headers.set('last-event-id', opts.lastEventId);
	}
	const url = `http://localhost/api/v1/pos/orders/stream${opts?.query ?? ''}`;
	return GET({
		request: new Request(url, { method: 'GET', headers, signal: controller.signal }),
		url: new URL(url),
		locals: locals()
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

describe('GET /api/v1/pos/orders/stream', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		findOrderCursor.mockReset();
		findOrderCursor.mockResolvedValue(null);
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
		for (const controller of openConnections.splice(0)) {
			controller.abort();
		}
	});

	it('requires pos:stream and opens an event stream', async () => {
		const res = await callGet();
		expect(requireApiKey.mock.calls[0][1]).toBe('pos:stream');
		expect(res.headers.get('content-type')).toMatch(/^text\/event-stream/);
	});

	it('puts the order id on the id: line, as the seam specifies', async () => {
		const res = await callGet();
		await readFrames(res, 2);
		for (const listener of subscribers) {
			listener(paidOrder({ id: '3f2a0c' }));
		}
		const [frame] = await readFrames(res, 1);
		expect(frame.split('\n')[0]).toBe('id: 3f2a0c');
	});

	it('sends the seam payload: orderId, amount in major units, nothing else', async () => {
		const res = await callGet();
		await readFrames(res, 2);
		for (const listener of subscribers) {
			listener(paidOrder({ amount: 20 }));
		}
		const [frame] = await readFrames(res, 1);
		const data = JSON.parse(frame.split('\n')[1].slice('data: '.length));
		expect(data).toEqual({ orderId: '3f2a0c', amount: { amount: 20, currency: 'CHF' } });
	});

	it('resumes after the order named by Last-Event-ID', async () => {
		findOrderCursor.mockResolvedValue({ ms: 1735689600000, orderId: 'ord-a' });
		const res = await callGet({ lastEventId: 'ord-a' });
		await readFrames(res, 3);
		expect(findOrderCursor).toHaveBeenCalledWith('ord-a');
	});

	it('treats an unknown Last-Event-ID as advisory, not as an error', async () => {
		findOrderCursor.mockResolvedValue(null);
		const res = await callGet({ lastEventId: 'never-issued' });
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toMatch(/^text\/event-stream/);
	});

	it('rejects a since_ts that is not epoch seconds', async () => {
		const res = await callGet({ query: '?since_ts=yesterday' });
		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'VALIDATION_ERROR', details: { field: 'since_ts' } }
		});
	});

	it('opens with a retry hint and a comment, so the connection flushes', async () => {
		const frames = await readFrames(await callGet(), 2);
		expect(frames[0]).toBe('retry: 5000');
		expect(frames[1]).toBe(':ok');
	});

	it('keeps emitting :heartbeat, so silence can be told from a dead connection', async () => {
		const res = await callGet();
		const frames = await readFrames(res, 5);
		expect(frames.slice(2)).toEqual([':heartbeat', ':heartbeat', ':heartbeat']);
	});

	it('holds the heartbeat under the 30s the seam allows', async () => {
		const { SSE_HEARTBEAT_MS } = await vi.importActual<
			typeof import('$lib/server/api/v1/orders/paidStream')
		>('$lib/server/api/v1/orders/paidStream');
		expect(SSE_HEARTBEAT_MS).toBeLessThanOrEqual(30_000);
	});
});
