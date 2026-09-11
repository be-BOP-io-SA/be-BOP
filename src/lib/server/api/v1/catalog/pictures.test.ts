import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImageData, Picture } from '$lib/types/Picture';

const find = vi.fn();
const findOne = vi.fn();
const send = vi.fn();
const s3IsConfigured = vi.fn();

vi.mock('$lib/server/database', () => ({
	collections: {
		pictures: {
			find: (...args: unknown[]) => find(...args),
			findOne: (...args: unknown[]) => findOne(...args)
		}
	}
}));
vi.mock('$lib/server/env-config', () => ({ ORIGIN: 'https://shop.example' }));
vi.mock('$lib/server/runtime-config', () => ({ runtimeConfig: { s3: { bucket: 'bebop' } } }));
vi.mock('$lib/server/s3', () => ({
	getS3Client: () => ({ send: (...args: unknown[]) => send(...args) }),
	s3IsConfigured: () => s3IsConfigured()
}));

import {
	catalogPictureUrl,
	findProductPicture,
	loadCatalogPictures,
	lowestResolutionFormat,
	resetCatalogPictureCache,
	selectFormats,
	toPictureDto,
	usableFormats
} from './pictures';
import { GENERATED_PICTURE_WIDTHS, parsePictureOptions } from './pictureOptions';

const API = 'https://shop.example/api/v1/catalog/products';

function format(width: number, height: number, size = 1000): ImageData {
	return { key: `products/p/pic-${width}x${height}.webp`, width, height, size };
}

function picture(opts: { id?: string; productId?: string; formats: ImageData[] }): Picture {
	return {
		_id: opts.id ?? 'pic',
		name: 'pic',
		productId: opts.productId ?? 'p',
		storage: { original: format(4000, 3000, 900_000), formats: opts.formats },
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

/** The five buckets upload generates. */
const everySize = [
	format(128, 96),
	format(256, 192),
	format(512, 384),
	format(1024, 768),
	format(2048, 1536)
];

/** Mongo cursor stub: find().sort().toArray() */
function cursorOf(docs: unknown[]) {
	return { sort: () => ({ toArray: async () => docs }) };
}

function s3Returns(body: Uint8Array) {
	send.mockResolvedValue({ Body: { transformToByteArray: async () => body } });
}

describe('parsePictureOptions', () => {
	it('defaults to linked URLs and every size', () => {
		expect(parsePictureOptions(undefined, undefined)).toEqual({
			options: { encoding: 'url', size: 'all' }
		});
	});

	it('reads both parameters, case-insensitively', () => {
		expect(parsePictureOptions('DATA-URI', 'ALL')).toEqual({
			options: { encoding: 'data-uri', size: 'all' }
		});
	});

	it('accepts a width in pixels', () => {
		for (const width of GENERATED_PICTURE_WIDTHS) {
			expect(parsePictureOptions(undefined, String(width))).toEqual({
				options: { encoding: 'url', size: width }
			});
		}
	});

	it('accepts a width upload does not generate — resolution handles it', () => {
		expect(parsePictureOptions(undefined, '300')).toEqual({
			options: { encoding: 'url', size: 300 }
		});
	});

	it('rejects a width that is not a positive integer', () => {
		for (const size of ['0', '-1', '12.5', 'medium', '1e3']) {
			const res = parsePictureOptions(undefined, size);
			expect('error' in res && res.error.field).toBe('sizes');
		}
	});

	it('rejects an unknown encoding rather than serving a different one', () => {
		const res = parsePictureOptions('base64', undefined);
		expect('error' in res && res.error.field).toBe('picture');
	});

	it('treats an empty parameter as absent', () => {
		expect(parsePictureOptions('', '  ')).toEqual({
			options: { encoding: 'url', size: 'all' }
		});
	});
});

describe('selectFormats', () => {
	it('returns every format for "all", smallest first', () => {
		expect(selectFormats(picture({ formats: everySize }), 'all').map((f) => f.width)).toEqual([
			128, 256, 512, 1024, 2048
		]);
	});

	it('returns the exact width when it exists', () => {
		const p = picture({ formats: everySize });
		for (const width of GENERATED_PICTURE_WIDTHS) {
			expect(selectFormats(p, width)[0].width).toBe(width);
		}
	});

	it('falls back to the largest format at or below the requested width', () => {
		const p = picture({ formats: [format(128, 96), format(256, 192)] });
		expect(selectFormats(p, 1024)[0].width).toBe(256);
		expect(selectFormats(p, 300)[0].width).toBe(256);
	});

	it('falls back to the smallest when even that exceeds the request', () => {
		const p = picture({ formats: [format(900, 700)] });
		expect(selectFormats(p, 128)[0].width).toBe(900);
	});

	it('is empty for a picture with no usable format', () => {
		expect(selectFormats(picture({ formats: [] }), 512)).toEqual([]);
	});
});

describe('usableFormats and lowestResolutionFormat', () => {
	it('drops formats missing a key or dimensions', () => {
		const broken = { key: '', width: 16, height: 16, size: 10 } as ImageData;
		expect(usableFormats(picture({ formats: [broken, format(128, 96)] }))).toHaveLength(1);
	});

	it('breaks an area tie on the lighter file', () => {
		const p = picture({ formats: [format(128, 96, 5000), format(96, 128, 2000)] });
		expect(lowestResolutionFormat(p)?.size).toBe(2000);
	});

	it('is null when nothing was generated', () => {
		expect(lowestResolutionFormat(picture({ formats: [] }))).toBeNull();
	});
});

describe('catalogPictureUrl', () => {
	it('points at the API route, not the storefront one headless mode gates', () => {
		expect(catalogPictureUrl('tartiflette', 128)).toBe(`${API}/tartiflette/picture/128`);
	});

	it('escapes a product id that would otherwise break the path', () => {
		expect(catalogPictureUrl('a/b', 128)).toBe(`${API}/a%2Fb/picture/128`);
	});
});

describe('toPictureDto', () => {
	beforeEach(() => {
		send.mockReset();
		resetCatalogPictureCache();
		s3Returns(new Uint8Array([1, 2, 3]));
	});

	it('links every size by default, and moves no bytes', async () => {
		const dto = await toPictureDto(picture({ id: 'pic-1', formats: everySize }));
		expect(dto?.formats.map((f) => f.url)).toEqual([
			`${API}/p/picture/128`,
			`${API}/p/picture/256`,
			`${API}/p/picture/512`,
			`${API}/p/picture/1024`,
			`${API}/p/picture/2048`
		]);
		expect(send).not.toHaveBeenCalled();
	});

	it('narrows to one size when a width is asked for', async () => {
		const dto = await toPictureDto(picture({ id: 'pic-1', formats: everySize }), {
			encoding: 'url',
			size: 256
		});
		expect(dto?.width).toBe(256);
		expect(dto?.formats).toHaveLength(1);
	});

	it('inlines the bytes when asked, instead of linking', async () => {
		const dto = await toPictureDto(picture({ formats: [format(128, 96)] }), {
			encoding: 'data-uri',
			size: 128
		});
		expect(dto?.url).toBe('data:image/webp;base64,AQID');
		expect(dto?.formats[0].url).toBe('data:image/webp;base64,AQID');
	});

	it('reads each object once, then serves it from cache', async () => {
		const p = picture({ formats: [format(128, 96)] });
		await toPictureDto(p, { encoding: 'data-uri', size: 128 });
		await toPictureDto(p, { encoding: 'data-uri', size: 128 });
		expect(send).toHaveBeenCalledTimes(1);
	});

	it('omits a size whose object cannot be read rather than emitting a broken entry', async () => {
		send.mockResolvedValue({ Body: undefined });
		expect(
			await toPictureDto(picture({ formats: [format(128, 96)] }), {
				encoding: 'data-uri',
				size: 128
			})
		).toBeNull();
	});

	it('is null for "none"', async () => {
		expect(
			await toPictureDto(picture({ formats: everySize }), { encoding: 'none', size: 'all' })
		).toBeNull();
	});

	it('is null for a picture with no usable format', async () => {
		expect(await toPictureDto(picture({ formats: [] }))).toBeNull();
	});
});

describe('loadCatalogPictures', () => {
	beforeEach(() => {
		find.mockReset();
		send.mockReset();
		s3IsConfigured.mockReset();
		s3IsConfigured.mockReturnValue(true);
		resetCatalogPictureCache();
		s3Returns(new Uint8Array([1, 2, 3]));
	});

	it('advertises the main picture of each product', async () => {
		find.mockReturnValue(cursorOf([picture({ id: 'pic-1', formats: everySize })]));
		expect((await loadCatalogPictures(['p'])).get('p')?.url).toBe(`${API}/p/picture/128`);
	});

	it('passes the requested encoding and size through', async () => {
		find.mockReturnValue(cursorOf([picture({ formats: everySize })]));
		const pictures = await loadCatalogPictures(['p'], { encoding: 'data-uri', size: 512 });
		expect(pictures.get('p')?.width).toBe(512);
		expect(pictures.get('p')?.url).toMatch(/^data:image\/webp;base64,/);
	});

	it('skips Mongo entirely for "none"', async () => {
		expect((await loadCatalogPictures(['p'], { encoding: 'none', size: 'all' })).size).toBe(0);
		expect(find).not.toHaveBeenCalled();
	});

	it('asks Mongo only for the products of the page, ranked as the PoS ranks them', async () => {
		find.mockReturnValue(cursorOf([]));
		await loadCatalogPictures(['a', 'b']);
		expect(find.mock.calls[0][0]).toEqual({ productId: { $in: ['a', 'b'] } });
	});

	it('keeps the first picture of a product that has several', async () => {
		find.mockReturnValue(
			cursorOf([
				picture({ id: 'first', formats: [format(128, 96)] }),
				picture({ id: 'second', formats: [format(64, 48)] })
			])
		);
		expect((await loadCatalogPictures(['p'])).get('p')?.url).toBe(`${API}/p/picture/128`);
	});

	it('touches nothing when S3 is not configured', async () => {
		s3IsConfigured.mockReturnValue(false);
		expect((await loadCatalogPictures(['p'])).size).toBe(0);
		expect(find).not.toHaveBeenCalled();
	});

	it('short-circuits an empty page', async () => {
		expect((await loadCatalogPictures([])).size).toBe(0);
		expect(find).not.toHaveBeenCalled();
	});

	it('degrades to a catalog without that image rather than failing', async () => {
		find.mockReturnValue(cursorOf([picture({ formats: [format(128, 96)] })]));
		send.mockRejectedValue(new Error('connect ECONNREFUSED'));
		await expect(loadCatalogPictures(['p'], { encoding: 'data-uri', size: 128 })).resolves.toEqual(
			new Map()
		);
	});
});

describe('findProductPicture', () => {
	beforeEach(() => {
		findOne.mockReset();
		s3IsConfigured.mockReset();
		s3IsConfigured.mockReturnValue(true);
	});

	it('reads the product first picture, ranked as the PoS ranks them', async () => {
		findOne.mockResolvedValue(picture({ formats: [format(128, 96)] }));
		await findProductPicture('p');
		expect(findOne.mock.calls[0][0]).toEqual({ productId: 'p' });
		expect(findOne.mock.calls[0][1]).toEqual({ sort: { order: 1, createdAt: 1 } });
	});

	it('honours the requested width', async () => {
		findOne.mockResolvedValue(picture({ formats: everySize }));
		expect((await findProductPicture('p', { encoding: 'url', size: 1024 }))?.width).toBe(1024);
	});

	it('never touches Mongo when S3 is not configured', async () => {
		s3IsConfigured.mockReturnValue(false);
		expect(await findProductPicture('p')).toBeNull();
		expect(findOne).not.toHaveBeenCalled();
	});

	it('is null for a product without a picture', async () => {
		findOne.mockResolvedValue(null);
		expect(await findProductPicture('p')).toBeNull();
	});
});
