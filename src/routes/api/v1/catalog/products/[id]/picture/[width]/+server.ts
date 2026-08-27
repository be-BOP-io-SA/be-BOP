import type { RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { apiError } from '$lib/server/api/v1/errors';
import { usableFormats } from '$lib/server/picture-formats';
import { collections } from '$lib/server/database';
import { catalogVisibilityFilter } from '$lib/server/product-visibility';
import { respondWithFormat } from '$lib/server/serve-picture';
import type { Picture } from '$lib/types/Picture';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/**
 * One size of a product's main picture.
 *
 * The storefront serves the same objects from `/picture/raw`, which lives in the `(app)` group that
 * headless mode gates or bypasses (#2616); the API needs a route that survives it. The serving is
 * shared — only the mount point and the addressing differ, this one by product rather than by
 * picture id.
 *
 * Unauthenticated, like the storefront route: a custom storefront renders these in a browser, and a
 * key would break every plain `<img src>`. Access is bounded by product visibility instead — an
 * image is reachable only for a product the catalog would name.
 */
export const GET: RequestHandler = apiV1Handler(async (event) => {
	// apiV1Handler hands back a generic RequestEvent, so params are Partial. Narrow, do not assert.
	const id = event.params.id;
	const width = Number.parseInt(event.params.width ?? '', 10);
	if (!id || !Number.isSafeInteger(width) || width < 1) {
		return apiError(404, 'NOT_FOUND', 'Picture not found');
	}

	const product = await collections.products.findOne(
		{ $and: [catalogVisibilityFilter(), { $or: [{ _id: id }, { alias: id }] }] },
		{ projection: { _id: 1 } }
	);
	if (!product) {
		return apiError(404, 'NOT_FOUND', 'Product not found');
	}

	const doc = await collections.pictures.findOne(
		{ productId: product._id },
		{ sort: { order: 1, createdAt: 1 } }
	);
	const format = doc
		? usableFormats(doc as Picture).find((candidate) => candidate.width === width)
		: undefined;
	if (!format) {
		return apiError(404, 'NOT_FOUND', 'Product has no picture in that size');
	}

	return respondWithFormat(format);
});
