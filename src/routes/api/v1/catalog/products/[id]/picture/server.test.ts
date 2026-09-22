import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const productFindOne = vi.fn();
const findProductPicture = vi.fn();

vi.mock('$lib/server/api/v1/auth', () => ({
	requireApiKey: (...args: unknown[]) => requireApiKey(...args)
}));
vi.mock('$lib/server/rateLimit', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimit(...args)
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { apiV1: { corsOrigins: [] } }
}));
vi.mock('$lib/server/database', () => ({
	collections: { products: { findOne: (...args: unknown[]) => productFindOne(...args) } }
}));
vi.mock('$lib/server/api/v1/catalog/pictures', () => ({
	findProductPicture: (...args: unknown[]) => findProductPicture(...args)
}));

import { GET } from './+server';

const RAW = 'https://shop.example/picture/raw';
const PICTURE = {
	url: `${RAW}/pic-1/format/128`,
	width: 128,
	height: 96,
	formats: [
		{ url: `${RAW}/pic-1/format/128`, width: 128, height: 96 },
		{ url: `${RAW}/pic-1/format/512`, width: 512, height: 384 }
	]
};

function call(opts?: { id?: string; ifNoneMatch?: string; withKey?: boolean }) {
	const headers = new Headers();
	if (opts?.ifNoneMatch) {
		headers.set('if-none-match', opts.ifNoneMatch);
	}
	const id = opts?.id ?? 'tartiflette';
	const url = `http://localhost/api/v1/catalog/products/${id}/picture`;
	const locals =
		opts?.withKey === false
			? {}
			: {
					apiKey: {
						_id: new ObjectId(),
						name: 't',
						scopes: ['catalog:read'] as const,
						keyPrefix: 'bebop_ak_test_abcd1234'
					}
			  };
	return GET({
		request: new Request(url, { method: 'GET', headers }),
		url: new URL(url),
		params: { id },
		locals
	} as unknown as Parameters<typeof GET>[0]);
}

describe('GET /api/v1/catalog/products/{id}/picture', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		productFindOne.mockReset();
		productFindOne.mockResolvedValue({ _id: 'tartiflette' });
		findProductPicture.mockReset();
		findProductPicture.mockResolvedValue(PICTURE);
		requireApiKey.mockImplementation(async (event: { locals: { apiKey?: unknown } }) => {
			if (!event.locals.apiKey) {
				const { apiError } = await import('$lib/server/api/v1/errors');
				return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
			}
			return event.locals.apiKey;
		});
	});

	it('requires catalog:read', async () => {
		await call();
		expect(requireApiKey.mock.calls[0][1]).toBe('catalog:read');
	});

	it('401s without an API key', async () => {
		expect((await call({ withKey: false })).status).toBe(401);
	});

	it('answers JSON, not bytes — the bytes live behind the links it returns', async () => {
		const res = await call();
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toMatch(/^application\/json/);
		await expect(res.json()).resolves.toEqual({ ok: true, picture: PICTURE });
	});

	it('points every size at the storefront picture route', async () => {
		const body = await (await call()).json();
		for (const size of body.picture.formats) {
			expect(size.url).toContain('/picture/raw/');
		}
	});

	it('accepts an alias as well as an id', async () => {
		await call({ id: 'my-alias' });
		expect(productFindOne.mock.calls[0][0].$and[1]).toEqual({
			$or: [{ _id: 'my-alias' }, { alias: 'my-alias' }]
		});
	});

	it('resolves the picture against the canonical product id', async () => {
		productFindOne.mockResolvedValue({ _id: 'canonical' });
		await call({ id: 'my-alias' });
		expect(findProductPicture).toHaveBeenCalledWith('canonical', {
			encoding: 'url',
			size: 'all'
		});
	});

	it('carries a validator so a caller can revalidate cheaply', async () => {
		const res = await call();
		expect(res.headers.get('ETag')).toMatch(/^"[0-9a-f]{64}"$/);
	});

	it('answers 304 on a matching If-None-Match', async () => {
		const etag = (await call()).headers.get('ETag') ?? '';
		const res = await call({ ifNoneMatch: etag });
		expect(res.status).toBe(304);
		expect(await res.text()).toBe('');
	});

	it('404s on a product that is not visible in the catalog', async () => {
		productFindOne.mockResolvedValue(null);
		expect((await call()).status).toBe(404);
		expect(findProductPicture).not.toHaveBeenCalled();
	});

	it('404s on a product without a picture', async () => {
		findProductPicture.mockResolvedValue(null);
		expect((await call()).status).toBe(404);
	});

	it('429s when the API key is rate limited', async () => {
		checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 11 });
		const res = await call();
		expect(res.status).toBe(429);
		expect(res.headers.get('Retry-After')).toBe('11');
	});
});
