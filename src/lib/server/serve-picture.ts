import { error } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { S3_PROXY_DOWNLOADS } from '$lib/server/env-config';
import { catalogVisibilityFilter } from '$lib/server/product-visibility';
import { getPrivateS3DownloadLink, getPublicS3DownloadLink } from '$lib/server/s3';
import type { ImageData, Picture } from '$lib/types/Picture';

/**
 * We prefer to act as a middleman to add cache-control headers. Chrome could handle caching with
 * redirects but not Firefox, and it should be faster when the object store runs locally.
 */
const imageRedirect = S3_PROXY_DOWNLOADS !== 'true';

const REDIRECT_EXPIRES_IN = 7 * 24 * 3600;

/**
 * Whether a picture may be served to anyone who knows its id.
 *
 * A picture attached to a product is only served when that product is one the catalog would
 * return. Everything else — the shop logo, tag and slider art, gallery and schedule images — has no
 * product to check and is public by nature.
 *
 * An id alone is not an access control: it is unguessable, which is not the same thing.
 */
async function isServable(picture: Picture): Promise<boolean> {
	if (!picture.productId) {
		return true;
	}
	const product = await collections.products.findOne(
		{ $and: [catalogVisibilityFilter(), { _id: picture.productId }] },
		{ projection: { _id: 1 } }
	);
	return !!product;
}

/** The stored object bytes, or a redirect to them, with long-lived cache headers. */
export async function respondWithFormat(format: ImageData): Promise<Response> {
	if (imageRedirect) {
		return new Response(null, {
			status: 302,
			headers: {
				location: await getPublicS3DownloadLink(format.key, {
					input: { ResponseCacheControl: 'max-age=31536000, public, immutable' },
					expiresIn: REDIRECT_EXPIRES_IN
				}),
				// Helps with Chrome. Firefox doesn't handle it.
				'cache-control': `max-age=${REDIRECT_EXPIRES_IN}, public, immutable`
			}
		});
	}

	const link = await getPrivateS3DownloadLink(format.key, {
		input: { ResponseCacheControl: 'max-age=31536000, public, immutable' }
	});
	const res = await fetch(link);
	// Until we handle/store ETag properly.
	const headers = new Headers([...res.headers.entries()].filter(([k]) => k !== 'etag'));
	return new Response(res.body, { status: res.status, headers });
}

/**
 * One size of one picture, addressed by picture id — what the storefront links to.
 *
 * Throws 404 for an unknown picture, an unknown size, or a picture belonging to a product the
 * catalog would not return.
 */
export async function servePictureFormat(pictureId: string, width: number): Promise<Response> {
	const doc = await collections.pictures.findOne({
		_id: pictureId,
		'storage.formats.width': width
	});
	if (!doc) {
		throw error(404);
	}
	const picture = doc as Picture;
	if (!(await isServable(picture))) {
		throw error(404);
	}
	const format = picture.storage.formats.find((f) => f.width === width);
	if (!format) {
		throw error(500, "Error when finding picture's format");
	}
	return respondWithFormat(format);
}
