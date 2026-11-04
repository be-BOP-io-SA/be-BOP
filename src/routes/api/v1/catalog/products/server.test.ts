import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const listCatalogProducts = vi.fn();

vi.mock('$lib/server/api/v1/auth', () => ({
	requireApiKey: (...args: unknown[]) => requireApiKey(...args)
}));
vi.mock('$lib/server/rateLimit', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimit(...args)
}));
vi.mock('$lib/server/api/v1/catalog/listProducts', () => ({
	listCatalogProducts: (...args: unknown[]) => listCatalogProducts(...args)
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { defaultLanguage: 'en', apiV1: { corsOrigins: ['https://allowed.example'] } }
}));

import { GET } from './+server';

function call(opts?: { origin?: string; query?: string; ifNoneMatch?: string }) {
	const headers = new Headers();
	if (opts?.origin) {
		headers.set('origin', opts.origin);
	}
	if (opts?.ifNoneMatch) {
		headers.set('if-none-match', opts.ifNoneMatch);
	}
	const locals = {
		apiKey: {
			_id: new ObjectId(),
			name: 't',
			scopes: ['catalog:read'] as const,
			keyPrefix: 'bebop_ak_test_abcd1234'
		},
		clientIp: '203.0.113.50'
	};
	const url = `http://localhost/api/v1/catalog/products${opts?.query ?? ''}`;
	return GET({
		request: new Request(url, { method: 'GET', headers }),
		url: new URL(url),
		locals
	} as unknown as Parameters<typeof GET>[0]);
}

describe('GET /api/v1/catalog/products', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		listCatalogProducts.mockReset();
		requireApiKey.mockImplementation(async (event: { locals: { apiKey?: unknown } }) => {
			if (!event.locals.apiKey) {
				const { apiError } = await import('$lib/server/api/v1/errors');
				return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
			}
			return event.locals.apiKey;
		});
		listCatalogProducts.mockResolvedValue({
			products: [{ id: 'espresso', name: 'Espresso', alias: [], type: 'resource' }],
			page: { limit: 20, nextCursor: null },
			language: 'en'
		});
	});

	it('requires catalog:read', async () => {
		await call();
		expect(requireApiKey).toHaveBeenCalled();
		const scope = requireApiKey.mock.calls[0][1];
		expect(scope).toBe('catalog:read');
	});

	it('returns catalog JSON with CORS on allowlisted origin', async () => {
		const res = await call({ origin: 'https://allowed.example' });
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.products[0].id).toBe('espresso');
		expect(res.headers.get('access-control-allow-origin')).toBe('https://allowed.example');
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

	it('returns a fresh 200 + new ETag when the catalog changed', async () => {
		const etag = (await call()).headers.get('etag');
		listCatalogProducts.mockResolvedValueOnce({
			products: [{ id: 'latte', name: 'Latte', alias: [], type: 'resource' }],
			page: { limit: 20, nextCursor: null },
			language: 'en'
		});
		const res = await call({ ifNoneMatch: etag as string });
		expect(res.status).toBe(200);
		expect(res.headers.get('etag')).not.toBe(etag);
		await expect(res.json()).resolves.toMatchObject({ products: [{ id: 'latte' }] });
	});

	it('returns 401 without API key', async () => {
		requireApiKey.mockResolvedValueOnce(
			(await import('$lib/server/api/v1/errors')).apiError(401, 'UNAUTHORIZED', 'Missing API key')
		);
		const res = await GET({
			request: new Request('http://localhost/api/v1/catalog/products'),
			url: new URL('http://localhost/api/v1/catalog/products'),
			locals: {}
		} as unknown as Parameters<typeof GET>[0]);
		expect(res.status).toBe(401);
	});

	it('returns 403 when requireApiKey rejects scope', async () => {
		requireApiKey.mockResolvedValueOnce(
			(await import('$lib/server/api/v1/errors')).apiError(
				403,
				'FORBIDDEN',
				'API key lacks required scope: catalog:read'
			)
		);
		const res = await call();
		expect(res.status).toBe(403);
	});
});
