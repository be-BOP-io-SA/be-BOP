import { beforeEach, describe, expect, it, vi } from 'vitest';

const productFindOne = vi.fn();
const pictureFindOne = vi.fn();
const respondWithFormat = vi.fn();

vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { apiV1: { corsOrigins: [] } }
}));
vi.mock('$lib/server/database', () => ({
	collections: {
		products: { findOne: (...args: unknown[]) => productFindOne(...args) },
		pictures: { findOne: (...args: unknown[]) => pictureFindOne(...args) }
	}
}));
vi.mock('$lib/server/serve-picture', () => ({
	respondWithFormat: (...args: unknown[]) => respondWithFormat(...args)
}));

import { GET } from './+server';

const VISIBILITY = {
	$or: [{ 'actionSettings.eShop.visible': true }, { 'actionSettings.retail.visible': true }]
};

function format(width: number) {
	return { key: `products/p/pic-${width}.webp`, width, height: width, size: 100 };
}

function call(opts?: { id?: string; width?: string }) {
	const id = opts?.id ?? 'tartiflette';
	const width = opts?.width ?? '128';
	const url = `http://localhost/api/v1/catalog/products/${id}/picture/${width}`;
	return GET({
		request: new Request(url, { method: 'GET' }),
		url: new URL(url),
		params: { id, width },
		locals: {}
	} as unknown as Parameters<typeof GET>[0]);
}

describe('GET /api/v1/catalog/products/{id}/picture/{width}', () => {
	beforeEach(() => {
		productFindOne.mockReset();
		productFindOne.mockResolvedValue({ _id: 'tartiflette' });
		pictureFindOne.mockReset();
		pictureFindOne.mockResolvedValue({
			_id: 'pic-1',
			productId: 'tartiflette',
			storage: { formats: [format(128), format(512)] }
		});
		respondWithFormat.mockReset();
		respondWithFormat.mockResolvedValue(new Response(null, { status: 302 }));
	});

	it('serves without an API key — a custom storefront renders these in a browser', async () => {
		expect((await call()).status).toBe(302);
	});

	it('bounds access by product visibility instead of by credential', async () => {
		await call();
		expect(productFindOne.mock.calls[0][0]).toEqual({
			$and: [VISIBILITY, { $or: [{ _id: 'tartiflette' }, { alias: 'tartiflette' }] }]
		});
	});

	it('404s on a product the catalog would not name', async () => {
		productFindOne.mockResolvedValue(null);
		expect((await call()).status).toBe(404);
		expect(pictureFindOne).not.toHaveBeenCalled();
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
		expect(pictureFindOne.mock.calls[0][0]).toEqual({ productId: 'canonical' });
	});

	it('takes the main picture, ranked as the PoS ranks them', async () => {
		await call();
		expect(pictureFindOne.mock.calls[0][1]).toEqual({ sort: { order: 1, createdAt: 1 } });
	});

	it('serves the size asked for', async () => {
		await call({ width: '512' });
		expect(respondWithFormat.mock.calls[0][0].width).toBe(512);
	});

	it('404s on a size be-BOP never generated, rather than substituting one', async () => {
		expect((await call({ width: '4096' })).status).toBe(404);
		expect(respondWithFormat).not.toHaveBeenCalled();
	});

	it('404s on a product with no picture at all', async () => {
		pictureFindOne.mockResolvedValue(null);
		expect((await call()).status).toBe(404);
	});

	it('404s on a width that is not a positive integer', async () => {
		for (const width of ['0', '-1', 'wide', '']) {
			expect((await call({ width })).status).toBe(404);
		}
	});
});
