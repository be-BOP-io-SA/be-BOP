import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const findOrderCursor = vi.fn();
const ingestPosSales = vi.fn();
const listPosPaidOrders = vi.fn();

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
vi.mock('$lib/server/api/v1/pos/sales', () => ({
	ingestPosSales: (...args: unknown[]) => ingestPosSales(...args)
}));
vi.mock('$lib/server/api/v1/pos/paidEvents', () => ({
	listPosPaidOrders: (...args: unknown[]) => listPosPaidOrders(...args)
}));

import { GET, POST } from './+server';

function locals() {
	return {
		apiKey: {
			_id: new ObjectId(),
			name: 't',
			scopes: ['pos:read', 'pos:write'] as const,
			keyPrefix: 'bebop_ak_test_abcd1234'
		},
		clientIp: '203.0.113.50'
	};
}

function callGet(opts?: { query?: string; ifNoneMatch?: string }) {
	const headers = new Headers();
	if (opts?.ifNoneMatch) {
		headers.set('if-none-match', opts.ifNoneMatch);
	}
	const url = `http://localhost/api/v1/pos/orders${opts?.query ?? ''}`;
	return GET({
		request: new Request(url, { method: 'GET', headers }),
		url: new URL(url),
		locals: locals()
	} as unknown as Parameters<typeof GET>[0]);
}

function callPost(body: unknown) {
	const url = 'http://localhost/api/v1/pos/orders';
	const payload = typeof body === 'string' ? body : JSON.stringify(body);
	return POST({
		request: new Request(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: payload
		}),
		url: new URL(url),
		locals: locals()
	} as unknown as Parameters<typeof POST>[0]);
}

const sale = {
	externalOrderId: 'sale-1',
	soldAt: '2026-07-29T14:03:00.000Z',
	method: 'cashless',
	totalPrice: { amount: 12.5, currency: 'CHF' },
	items: [{ product: 'tartiflette', quantity: 1, price: { amount: 12.5, currency: 'CHF' } }]
};

describe('/api/v1/pos/orders', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		findOrderCursor.mockReset();
		findOrderCursor.mockResolvedValue(null);
		ingestPosSales.mockReset();
		ingestPosSales.mockResolvedValue({ response: { results: [] } });
		listPosPaidOrders.mockReset();
		listPosPaidOrders.mockResolvedValue({ orders: [], nextCursor: null });
		requireApiKey.mockImplementation(async (event: { locals: { apiKey?: unknown } }) => {
			if (!event.locals.apiKey) {
				const { apiError } = await import('$lib/server/api/v1/errors');
				return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
			}
			return event.locals.apiKey;
		});
	});

	describe('GET (poll)', () => {
		it('requires pos:read', async () => {
			await callGet();
			expect(requireApiKey.mock.calls[0][1]).toBe('pos:read');
		});

		it('answers JSON, not an event stream — the poll is the primary transport', async () => {
			const res = await callGet();
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toMatch(/^application\/json/);
			await expect(res.json()).resolves.toEqual({ orders: [], nextCursor: null });
		});

		it('carries a validator, so an unchanged page costs a bodyless 304', async () => {
			const etag = (await callGet()).headers.get('ETag') ?? '';
			expect(etag).toMatch(/^"[0-9a-f]{64}"$/);
			expect((await callGet({ ifNoneMatch: etag })).status).toBe(304);
		});

		it('resumes on the same last_event_id the stream uses', async () => {
			findOrderCursor.mockResolvedValue({ ms: 1735689600000, orderId: 'ord-a' });
			await callGet({ query: '?last_event_id=ord-a' });
			expect(findOrderCursor).toHaveBeenCalledWith('ord-a');
			expect(listPosPaidOrders).toHaveBeenCalledWith({
				since: null,
				after: { ms: 1735689600000, orderId: 'ord-a' },
				limit: 100
			});
		});

		it('reads since_ts as epoch seconds, like the stream', async () => {
			await callGet({ query: '?since_ts=1735689600' });
			expect(listPosPaidOrders.mock.calls[0][0].since).toEqual(new Date('2025-01-01T00:00:00Z'));
		});

		it('rejects a since_ts that is not epoch seconds', async () => {
			expect((await callGet({ query: '?since_ts=yesterday' })).status).toBe(400);
		});

		it('passes the tag the caller named, so be-BOP holds no domain word', async () => {
			await callGet({ query: '?tag=recharge' });
			expect(listPosPaidOrders.mock.calls[0][0].tag).toBe('recharge');
		});

		it('treats a blank tag as none, rather than matching an empty slug', async () => {
			await callGet({ query: '?tag=%20%20' });
			expect(listPosPaidOrders.mock.calls[0][0].tag).toBeUndefined();
		});

		it('narrows nothing when no tag is named', async () => {
			await callGet();
			expect(listPosPaidOrders.mock.calls[0][0].tag).toBeUndefined();
		});

		it('honours an explicit page size', async () => {
			await callGet({ query: '?limit=10' });
			expect(listPosPaidOrders.mock.calls[0][0].limit).toBe(10);
		});

		it('rejects a page size outside the allowed range', async () => {
			for (const limit of ['0', '-1', '501', 'ten']) {
				expect((await callGet({ query: `?limit=${limit}` })).status).toBe(400);
			}
		});

		it('429s when the API key is rate limited', async () => {
			checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 6 });
			const res = await callGet();
			expect(res.status).toBe(429);
			expect(res.headers.get('Retry-After')).toBe('6');
		});
	});

	describe('POST (batch)', () => {
		it('requires pos:write, not the general order-write scope', async () => {
			await callPost([sale]);
			expect(requireApiKey.mock.calls[0][1]).toBe('pos:write');
		});

		it('answers the seam envelope', async () => {
			ingestPosSales.mockResolvedValue({
				response: {
					results: [
						{
							externalOrderId: 'sale-1',
							status: 'success',
							orderUrl: 'https://shop.example/order/ord-1'
						}
					]
				}
			});
			const res = await callPost([sale]);
			expect(res.status).toBe(200);
			await expect(res.json()).resolves.toEqual({
				results: [
					{
						externalOrderId: 'sale-1',
						status: 'success',
						orderUrl: 'https://shop.example/order/ord-1'
					}
				]
			});
		});

		it('answers 400 on a refusal a retry cannot change, so the till stops resending', async () => {
			ingestPosSales.mockResolvedValue({
				rejection: {
					externalOrderId: 'sale-1',
					code: 'CURRENCY_UNSUPPORTED',
					message: 'Order currency SEK does not match shop main currency CHF',
					details: { orderCurrency: 'SEK', mainCurrency: 'CHF' },
					ingested: ['sale-0']
				}
			});
			const res = await callPost([sale]);
			expect(res.status).toBe(400);
			await expect(res.json()).resolves.toEqual({
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Order currency SEK does not match shop main currency CHF',
					details: {
						externalOrderId: 'sale-1',
						code: 'CURRENCY_UNSUPPORTED',
						domain: { orderCurrency: 'SEK', mainCurrency: 'CHF' },
						ingested: ['sale-0']
					}
				}
			});
		});

		it('reports an empty ingested list rather than omitting it', async () => {
			ingestPosSales.mockResolvedValue({
				rejection: {
					externalOrderId: 'sale-1',
					code: 'STOCK_UNAVAILABLE',
					message: 'out of stock',
					ingested: []
				}
			});
			const body = await (await callPost([sale])).json();
			expect(body.error.details).toEqual({
				externalOrderId: 'sale-1',
				code: 'STOCK_UNAVAILABLE',
				ingested: []
			});
		});

		it('rejects a malformed batch whole, ingesting nothing', async () => {
			const res = await callPost([{ ...sale, totalPrice: { amount: -1, currency: 'CHF' } }]);
			expect(res.status).toBe(400);
			expect(ingestPosSales).not.toHaveBeenCalled();
		});

		it('rejects an empty batch', async () => {
			expect((await callPost([])).status).toBe(400);
			expect(ingestPosSales).not.toHaveBeenCalled();
		});

		it('rejects a body that is not an array of sales', async () => {
			expect((await callPost({ orders: [sale] })).status).toBe(400);
		});

		it('rejects unparseable JSON', async () => {
			expect((await callPost('{')).status).toBe(400);
		});

		it('names the offending field so the till can fix its payload', async () => {
			const res = await callPost([{ ...sale, items: [{ ...sale.items[0], quantity: 0 }] }]);
			await expect(res.json()).resolves.toMatchObject({
				error: { code: 'VALIDATION_ERROR', details: { field: '0.items.0.quantity' } }
			});
		});

		it('429s when the API key is rate limited', async () => {
			checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 4 });
			const res = await callPost([sale]);
			expect(res.status).toBe(429);
			expect(res.headers.get('Retry-After')).toBe('4');
		});
	});
});
