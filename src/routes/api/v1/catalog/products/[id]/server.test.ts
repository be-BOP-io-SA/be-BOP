import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const getCatalogProduct = vi.fn();

vi.mock('$lib/server/api/v1/auth', () => ({
	requireApiKey: (...args: unknown[]) => requireApiKey(...args)
}));
vi.mock('$lib/server/rateLimit', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimit(...args)
}));
vi.mock('$lib/server/api/v1/catalog/listProducts', () => ({
	getCatalogProduct: (...args: unknown[]) => getCatalogProduct(...args),
	parseCatalogLanguage: (lang: string | undefined, fallback: string) => lang ?? fallback
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { defaultLanguage: 'en', apiV1: { corsOrigins: [] } }
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
			scopes: ['catalog:read'] as const,
			keyPrefix: 'bebop_ak_test_abcd1234'
		},
		clientIp: '203.0.113.50'
	};
	const url = 'http://localhost/api/v1/catalog/products/espresso';
	return GET({
		request: new Request(url, { method: 'GET', headers }),
		url: new URL(url),
		params: { id: 'espresso' },
		locals
	} as unknown as Parameters<typeof GET>[0]);
}

describe('GET /api/v1/catalog/products/[id]', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		getCatalogProduct.mockReset();
		requireApiKey.mockImplementation(
			async (event: { locals: { apiKey?: unknown } }) => event.locals.apiKey
		);
		getCatalogProduct.mockResolvedValue({ id: 'espresso', name: 'Espresso', type: 'resource' });
	});

	it('requires catalog:read and returns the product', async () => {
		const res = await call();
		expect(requireApiKey.mock.calls[0][1]).toBe('catalog:read');
		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toMatchObject({ ok: true, product: { id: 'espresso' } });
	});

	it('exposes a strong ETag and answers 304 on a matching If-None-Match', async () => {
		const etag = (await call()).headers.get('etag');
		expect(etag).toMatch(/^"[a-f0-9]{64}"$/);

		const res = await call({ ifNoneMatch: etag as string });
		expect(res.status).toBe(304);
		expect(res.headers.get('etag')).toBe(etag);
		await expect(res.text()).resolves.toBe('');
	});

	it('returns 404 without a validator when the product is not visible', async () => {
		getCatalogProduct.mockResolvedValueOnce(null);
		const res = await call();
		expect(res.status).toBe(404);
		expect(res.headers.get('etag')).toBeNull();
	});
});
