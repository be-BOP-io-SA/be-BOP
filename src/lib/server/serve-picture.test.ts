import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImageData, Picture } from '$lib/types/Picture';

const pictureFindOne = vi.fn();
const productFindOne = vi.fn();
const getPublicS3DownloadLink = vi.fn();
const getPrivateS3DownloadLink = vi.fn();

vi.mock('$lib/server/database', () => ({
	collections: {
		pictures: { findOne: (...args: unknown[]) => pictureFindOne(...args) },
		products: { findOne: (...args: unknown[]) => productFindOne(...args) }
	}
}));
vi.mock('$lib/server/env-config', () => ({ S3_PROXY_DOWNLOADS: '' }));
vi.mock('$lib/server/s3', () => ({
	getPublicS3DownloadLink: (...args: unknown[]) => getPublicS3DownloadLink(...args),
	getPrivateS3DownloadLink: (...args: unknown[]) => getPrivateS3DownloadLink(...args)
}));

import { servePictureFormat } from './serve-picture';

function format(width: number): ImageData {
	return { key: `products/p/pic-${width}.webp`, width, height: width, size: 100 };
}

function picture(opts?: { productId?: string; widths?: number[] }): Picture {
	return {
		_id: 'pic-1',
		name: 'pic',
		...(opts?.productId !== undefined && { productId: opts.productId }),
		storage: { original: format(4000), formats: (opts?.widths ?? [128]).map(format) },
		createdAt: new Date(),
		updatedAt: new Date()
	} as Picture;
}

/** The visibility filter the catalog uses, as it reaches Mongo. */
const VISIBILITY = {
	$or: [{ 'actionSettings.eShop.visible': true }, { 'actionSettings.retail.visible': true }]
};

async function status(pictureId: string, width: number): Promise<number> {
	try {
		return (await servePictureFormat(pictureId, width)).status;
	} catch (err) {
		return (err as { status: number }).status;
	}
}

describe('servePictureFormat', () => {
	beforeEach(() => {
		pictureFindOne.mockReset();
		productFindOne.mockReset();
		getPublicS3DownloadLink.mockReset();
		getPublicS3DownloadLink.mockResolvedValue('https://s3.example/signed');
		pictureFindOne.mockResolvedValue(picture({ productId: 'tartiflette' }));
		productFindOne.mockResolvedValue({ _id: 'tartiflette' });
	});

	describe('visibility', () => {
		it("checks the picture's product against the catalog filter", async () => {
			await status('pic-1', 128);
			expect(productFindOne.mock.calls[0][0]).toEqual({
				$and: [VISIBILITY, { _id: 'tartiflette' }]
			});
		});

		it('serves a picture whose product the catalog would name', async () => {
			expect(await status('pic-1', 128)).toBe(302);
		});

		it('refuses a picture whose product is hidden from both channels', async () => {
			productFindOne.mockResolvedValue(null);
			expect(await status('pic-1', 128)).toBe(404);
		});

		it('answers 404 rather than 403, so an id cannot be probed for existence', async () => {
			productFindOne.mockResolvedValue(null);
			expect(await status('pic-1', 128)).toBe(404);
		});

		it('serves a picture that belongs to no product — a logo has nothing to check', async () => {
			pictureFindOne.mockResolvedValue(picture());
			expect(await status('pic-1', 128)).toBe(302);
			expect(productFindOne).not.toHaveBeenCalled();
		});
	});

	describe('lookup', () => {
		it('asks for the picture and the width together', async () => {
			await status('pic-1', 128);
			expect(pictureFindOne.mock.calls[0][0]).toEqual({
				_id: 'pic-1',
				'storage.formats.width': 128
			});
		});

		it('is 404 for an unknown picture', async () => {
			pictureFindOne.mockResolvedValue(null);
			expect(await status('nope', 128)).toBe(404);
			expect(productFindOne).not.toHaveBeenCalled();
		});
	});

	describe('delivery', () => {
		it('redirects to a signed link when be-BOP is not proxying downloads', async () => {
			const res = await servePictureFormat('pic-1', 128);
			expect(res.status).toBe(302);
			expect(res.headers.get('location')).toBe('https://s3.example/signed');
		});

		it('signs the exact stored key of the requested width', async () => {
			pictureFindOne.mockResolvedValue(picture({ productId: 'tartiflette', widths: [128, 512] }));
			await servePictureFormat('pic-1', 512);
			expect(getPublicS3DownloadLink.mock.calls[0][0]).toBe('products/p/pic-512.webp');
		});

		it('caches hard — the key changes whenever the image does', async () => {
			const res = await servePictureFormat('pic-1', 128);
			expect(res.headers.get('cache-control')).toMatch(/immutable/);
		});
	});
});
