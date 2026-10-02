import type { RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { jsonWithETag } from '$lib/server/api/v1/validators';
import { listPosCatalog } from '$lib/server/api/v1/pos/catalog';
import { parsePictureOptions } from '$lib/server/api/v1/catalog/pictureOptions';
import { checkRateLimit } from '$lib/server/rateLimit';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { LanguageKey } from '$lib/translations';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/**
 * The catalog the till sells from, whole.
 *
 * Unpaginated: polled with `If-None-Match`, so an unchanged catalog costs a bodyless 304. That
 * depends on the response being deterministic — see `listPosCatalog` on the sort.
 */
export const GET: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'pos:read');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	const apiKey = apiKeyOrError;

	const limit = checkRateLimit(apiKey._id.toString(), 'api.v1.pos.catalog', 60, { minutes: 1 });
	if (limit.limited) {
		return apiError(429, 'RATE_LIMITED', 'Too many requests for this API key', undefined, {
			'Retry-After': String(limit.retryAfterSeconds)
		});
	}

	const picture = parsePictureOptions(
		event.url.searchParams.get('picture') ?? undefined,
		event.url.searchParams.get('sizes') ?? undefined
	);
	if ('error' in picture) {
		return apiError(400, 'VALIDATION_ERROR', picture.error.message, {
			field: picture.error.field
		});
	}

	const catalog = await listPosCatalog(
		runtimeConfig.defaultLanguage as LanguageKey,
		picture.options
	);
	return jsonWithETag(catalog, event.request);
});
