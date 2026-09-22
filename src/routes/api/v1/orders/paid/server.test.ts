import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const listPaidOrders = vi.fn();

vi.mock('$lib/server/api/v1/auth', () => ({
	requireApiKey: (...args: unknown[]) => requireApiKey(...args)
}));
vi.mock('$lib/server/rateLimit', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimit(...args)
}));
vi.mock('$lib/server/api/v1/orders/listPaid', () => ({
	listPaidOrders: (...args: unknown[]) => listPaidOrders(...args)
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { apiV1: { corsOrigins: ['https://allowed.example'] } }
}));

import { GET } from './+server';

function call(opts?: { ifNoneMatch?: string }) {
	const headers = new Headers();
	if (opts?.ifNoneMatch) {
		headers.set('if-none-match', opts.ifNoneMatch);
	}
	const locals = {
		apiKey: {
			_id: new ObjectId(),
			name: 't',
			scopes: ['orders:read'] as const,
			keyPrefix: 'bebop_ak_test_abcd1234'
		},
		clientIp: '203.0.113.50'
	};
	const url = 'http://localhost/api/v1/orders/paid';
	return GET({
		request: new Request(url, { method: 'GET', headers }),
		url: new URL(url),
		locals
	} as unknown as Parameters<typeof GET>[0]);
}

describe('GET /api/v1/orders/paid', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		listPaidOrders.mockReset();
		requireApiKey.mockImplementation(async (event: { locals: { apiKey?: unknown } }) => {
			if (!event.locals.apiKey) {
				const { apiError } = await import('$lib/server/api/v1/errors');
				return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
			}
			return event.locals.apiKey;
		});
		listPaidOrders.mockResolvedValue({ orders: [], page: { limit: 20, nextCursor: null } });
	});

	it('requires orders:read', async () => {
		await call();
		expect(requireApiKey.mock.calls[0][1]).toBe('orders:read');
	});

	it('returns 200 envelope', async () => {
		const res = await call();
		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toMatchObject({ ok: true, orders: [] });
	});

	it('exposes a strong ETag and answers 304 on a matching If-None-Match', async () => {
		const first = await call();
		const etag = first.headers.get('etag');
		expect(etag).toMatch(/^"[a-f0-9]{64}"$/);
		expect(first.headers.get('cache-control')).toBe('private, no-cache');

		const second = await call({ ifNoneMatch: etag as string });
		expect(second.status).toBe(304);
		expect(second.headers.get('etag')).toBe(etag);
		await expect(second.text()).resolves.toBe('');
	});

	it('returns a fresh 200 + new ETag once a new paid order lands', async () => {
		const etag = (await call()).headers.get('etag');
		listPaidOrders.mockResolvedValueOnce({
			orders: [{ id: 'order-1', status: 'paid' }],
			page: { limit: 20, nextCursor: null }
		});
		const res = await call({ ifNoneMatch: etag as string });
		expect(res.status).toBe(200);
		expect(res.headers.get('etag')).not.toBe(etag);
		await expect(res.json()).resolves.toMatchObject({ orders: [{ id: 'order-1' }] });
	});
});
