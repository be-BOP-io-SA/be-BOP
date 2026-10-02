import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const listPosCatalog = vi.fn();

vi.mock('$lib/server/api/v1/auth', () => ({
	requireApiKey: (...args: unknown[]) => requireApiKey(...args)
}));
vi.mock('$lib/server/rateLimit', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimit(...args)
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { apiV1: { corsOrigins: [] }, defaultLanguage: 'en' }
}));
vi.mock('$lib/server/api/v1/pos/catalog', () => ({
	listPosCatalog: (...args: unknown[]) => listPosCatalog(...args)
}));

import { GET } from './+server';

const PRODUCT = {
	slug: 'tartiflette',
	name: 'Tartiflette',
	shortDescription: 'Cheese and potatoes',
	price: { amount: 12.5, currency: 'CHF' },
	tagIds: ['cafe']
};

const TAG = { id: 'cafe', name: 'Café' };

function call(opts?: { ifNoneMatch?: string; withKey?: boolean }) {
	const headers = new Headers();
	if (opts?.ifNoneMatch) {
		headers.set('if-none-match', opts.ifNoneMatch);
	}
	const url = 'http://localhost/api/v1/pos/products';
	const locals =
		opts?.withKey === false
			? {}
			: {
					apiKey: {
						_id: new ObjectId(),
						name: 't',
						scopes: ['pos:read'] as const,
						keyPrefix: 'bebop_ak_test_abcd1234'
					}
			  };
	return GET({
		request: new Request(url, { method: 'GET', headers }),
		url: new URL(url),
		locals
	} as unknown as Parameters<typeof GET>[0]);
}

describe('GET /api/v1/pos/products', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		listPosCatalog.mockReset();
		listPosCatalog.mockResolvedValue({ products: [PRODUCT], tags: [TAG] });
		requireApiKey.mockImplementation(async (event: { locals: { apiKey?: unknown } }) => {
			if (!event.locals.apiKey) {
				const { apiError } = await import('$lib/server/api/v1/errors');
				return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
			}
			return event.locals.apiKey;
		});
	});

	it('requires pos:read, not the general catalog scope', async () => {
		await call();
		expect(requireApiKey.mock.calls[0][1]).toBe('pos:read');
	});

	it('401s without an API key', async () => {
		expect((await call({ withKey: false })).status).toBe(401);
	});

	it('answers the seam envelope plus the tag dictionary, and no pagination', async () => {
		const res = await call();
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(Object.keys(body)).toEqual(['products', 'tags']);
		expect(body.products).toEqual([PRODUCT]);
		expect(body.tags).toEqual([TAG]);
	});

	it('carries a strong ETag so the till can poll cheaply', async () => {
		const res = await call();
		expect(res.headers.get('ETag')).toMatch(/^"[0-9a-f]{64}"$/);
	});

	it('answers 304 on a matching If-None-Match', async () => {
		const etag = (await call()).headers.get('ETag') ?? '';
		const res = await call({ ifNoneMatch: etag });
		expect(res.status).toBe(304);
		expect(await res.text()).toBe('');
	});

	it('changes the validator when the catalog changes', async () => {
		const first = (await call()).headers.get('ETag');
		listPosCatalog.mockResolvedValue({ products: [{ ...PRODUCT, name: 'Renamed' }], tags: [TAG] });
		expect((await call()).headers.get('ETag')).not.toBe(first);
	});

	it('429s when the API key is rate limited', async () => {
		checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 9 });
		const res = await call();
		expect(res.status).toBe(429);
		expect(res.headers.get('Retry-After')).toBe('9');
	});
});
