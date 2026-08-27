import type { RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { jsonWithETag } from '$lib/server/api/v1/validators';
import { catalogVisibilityFilter } from '$lib/server/api/v1/catalog/listProducts';
import { findProductPicture } from '$lib/server/api/v1/catalog/pictures';
import { parsePictureOptions } from '$lib/server/api/v1/catalog/pictureOptions';
import { collections } from '$lib/server/database';
import { checkRateLimit } from '$lib/server/rateLimit';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/**
 * Where a product's main picture lives, in every size be-BOP generated.
 *
 * Returns metadata, not bytes: the links it carries point at `/picture/raw/{id}/format/{width}`.
 * The same object is embedded in `CatalogProduct.picture` — this serves a caller that wants one
 * product's sizes without re-reading a catalog page.
 */
export const GET: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'catalog:read');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	const apiKey = apiKeyOrError;

	const limit = checkRateLimit(apiKey._id.toString(), 'api.v1.catalog.read', 120, { minutes: 1 });
	if (limit.limited) {
		return apiError(429, 'RATE_LIMITED', 'Too many requests for this API key', undefined, {
			'Retry-After': String(limit.retryAfterSeconds)
		});
	}

	// apiV1Handler hands back a generic RequestEvent, so params are Partial. Narrow, do not assert.
	const id = event.params.id;
	if (!id) {
		return apiError(404, 'NOT_FOUND', 'Product not found');
	}

	const product = await collections.products.findOne(
		{ $and: [catalogVisibilityFilter(), { $or: [{ _id: id }, { alias: id }] }] },
		{ projection: { _id: 1 } }
	);
	if (!product) {
		return apiError(404, 'NOT_FOUND', 'Product not found');
	}

	const options = parsePictureOptions(
		event.url.searchParams.get('picture') ?? undefined,
		event.url.searchParams.get('sizes') ?? undefined
	);
	if ('error' in options) {
		return apiError(400, 'VALIDATION_ERROR', options.error.message, {
			field: options.error.field
		});
	}

	const picture = await findProductPicture(product._id, options.options);
	if (!picture) {
		return apiError(404, 'NOT_FOUND', 'Product has no picture');
	}

	return jsonWithETag({ ok: true, picture }, event.request);
});
