import { GetObjectCommand } from '@aws-sdk/client-s3';
import * as mimeTypes from 'mime-types';
import { collections } from '$lib/server/database';
import { ORIGIN } from '$lib/server/env-config';
import { runtimeConfig } from '$lib/server/runtime-config';
import { getS3Client, s3IsConfigured } from '$lib/server/s3';
import type { ImageData, Picture } from '$lib/types/Picture';
import { selectFormats } from '$lib/server/picture-formats';
import {
	DEFAULT_PICTURE_OPTIONS,
	type PictureEncoding,
	type PictureOptions
} from './pictureOptions';

export * from './pictureOptions';
export { lowestResolutionFormat, selectFormats, usableFormats } from '$lib/server/picture-formats';

/** One size of a picture. `url` is a link into be-BOP, or the image itself as a data URI. */
export type CatalogPictureSize = {
	url: string;
	width: number;
	height: number;
};

/** The selected size, plus the sizes the request asked to see. */
export type CatalogPictureDto = CatalogPictureSize & {
	formats: CatalogPictureSize[];
};

/**
 * The API's own picture route, addressed by product and width.
 *
 * Not the storefront's `/picture/raw`: that lives in the `(app)` group, which headless mode gates
 * or bypasses (#2616), and the API must keep working there. Both serve the same objects through the
 * same code, and neither exposes object storage to the caller.
 */
export function catalogPictureUrl(productId: string, width: number): string {
	const base = (ORIGIN ?? '').replace(/\/+$/, '');
	return `${base}/api/v1/catalog/products/${encodeURIComponent(productId)}/picture/${width}`;
}

/** Object bytes retained in-process for `data-uri`. Format keys are immutable, so a hit is valid. */
const CACHE_BUDGET_BYTES = 32 * 1024 * 1024;
const cache = new Map<string, Uint8Array>();
let cachedBytes = 0;

/** Test seam. */
export function resetCatalogPictureCache(): void {
	cache.clear();
	cachedBytes = 0;
}

function cacheGet(key: string): Uint8Array | undefined {
	const hit = cache.get(key);
	if (hit) {
		cache.delete(key);
		cache.set(key, hit);
	}
	return hit;
}

function cachePut(key: string, body: Uint8Array): void {
	if (body.byteLength > CACHE_BUDGET_BYTES) {
		return;
	}
	cache.set(key, body);
	cachedBytes += body.byteLength;
	while (cachedBytes > CACHE_BUDGET_BYTES) {
		const oldest = cache.keys().next();
		if (oldest.done) {
			break;
		}
		cachedBytes -= cache.get(oldest.value)?.byteLength ?? 0;
		cache.delete(oldest.value);
	}
}

/** Null when the object cannot be read; the caller then omits that size. */
export async function readPictureDataUri(format: ImageData): Promise<string | null> {
	const cached = cacheGet(format.key);
	const body =
		cached ??
		(await getS3Client()
			.send(new GetObjectCommand({ Bucket: runtimeConfig.s3.bucket, Key: format.key }))
			.then((result) => result.Body?.transformToByteArray()));
	if (!body) {
		return null;
	}
	if (!cached) {
		cachePut(format.key, body);
	}
	const mime = mimeTypes.lookup(format.key) || 'image/webp';
	return `data:${mime};base64,${Buffer.from(body).toString('base64')}`;
}

async function toSize(
	picture: Picture,
	format: ImageData,
	encoding: PictureEncoding
): Promise<CatalogPictureSize | null> {
	if (encoding === 'data-uri') {
		const url = await readPictureDataUri(format);
		return url ? { url, width: format.width, height: format.height } : null;
	}
	return {
		// Addressed by product, not by picture: the route resolves the product's main picture, so a
		// link stays valid when the shop replaces the image.
		url: catalogPictureUrl(picture.productId ?? picture._id, format.width),
		width: format.width,
		height: format.height
	};
}

/** Null when the picture has no usable format, or when `encoding` is `none`. */
export async function toPictureDto(
	picture: Picture,
	options: PictureOptions = DEFAULT_PICTURE_OPTIONS
): Promise<CatalogPictureDto | null> {
	if (options.encoding === 'none') {
		return null;
	}
	const formats = selectFormats(picture, options.size);
	const sizes = (
		await Promise.all(formats.map((format) => toSize(picture, format, options.encoding)))
	).filter((size): size is CatalogPictureSize => !!size);
	return sizes.length ? { ...sizes[0], formats: sizes } : null;
}

/** A product's main picture: its first, on the `order`/`createdAt` ranking the PoS uses. */
export async function findProductPicture(
	productId: string,
	options: PictureOptions = DEFAULT_PICTURE_OPTIONS
): Promise<CatalogPictureDto | null> {
	if (!s3IsConfigured()) {
		return null;
	}
	const doc = await collections.pictures.findOne(
		{ productId },
		{ sort: { order: 1, createdAt: 1 } }
	);
	return doc ? toPictureDto(doc as Picture, options) : null;
}

/**
 * Main picture per product id, for the products of one catalog page.
 *
 * With `url` encoding this costs one Mongo query and no S3 traffic — it only advertises where the
 * images live. `data-uri` reads every selected object, which is why it is opt-in.
 */
export async function loadCatalogPictures(
	productIds: string[],
	options: PictureOptions = DEFAULT_PICTURE_OPTIONS
): Promise<Map<string, CatalogPictureDto>> {
	const byProduct = new Map<string, CatalogPictureDto>();
	if (!productIds.length || options.encoding === 'none' || !s3IsConfigured()) {
		return byProduct;
	}

	const docs = await collections.pictures
		.find({ productId: { $in: productIds } })
		.sort({ order: 1, createdAt: 1 })
		.toArray();

	const mains = new Map<string, Picture>();
	for (const doc of docs) {
		const picture = doc as Picture;
		if (picture.productId && !mains.has(picture.productId)) {
			mains.set(picture.productId, picture);
		}
	}

	const entries = [...mains.entries()];
	const dtos = await Promise.all(
		entries.map(async ([productId, picture]) => {
			try {
				return await toPictureDto(picture, options);
			} catch (err) {
				console.error(`[api/v1] could not build picture for ${productId}`, err);
				return null;
			}
		})
	);
	for (const [index, dto] of dtos.entries()) {
		if (dto) {
			byProduct.set(entries[index][0], dto);
		}
	}
	return byProduct;
}
