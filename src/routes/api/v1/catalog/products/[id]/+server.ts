import type { RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { jsonWithETag } from '$lib/server/api/v1/validators';
import { getCatalogProduct, parseCatalogLanguage } from '$lib/server/api/v1/catalog/listProducts';
import { checkRateLimit } from '$lib/server/rateLimit';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { LanguageKey } from '$lib/translations';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

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

	const language = parseCatalogLanguage(
		event.url.searchParams.get('lang') ?? undefined,
		runtimeConfig.defaultLanguage as LanguageKey
	);
	// apiV1Handler hands back a generic RequestEvent, so params are Partial — the router
	// never matches this route without an id, but narrow it instead of asserting.
	const id = event.params.id;
	const product = id ? await getCatalogProduct(id, language) : null;
	if (!product) {
		return apiError(404, 'NOT_FOUND', 'Product not found');
	}
	return jsonWithETag({ ok: true, language, product }, event.request);
});
