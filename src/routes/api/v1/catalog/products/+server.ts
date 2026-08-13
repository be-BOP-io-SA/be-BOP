import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { listCatalogProducts } from '$lib/server/api/v1/catalog/listProducts';
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

	const url = event.url;
	const result = await listCatalogProducts(
		{
			type: url.searchParams.get('type') ?? undefined,
			tags: url.searchParams.get('tags') ?? undefined,
			limit: url.searchParams.get('limit') ?? undefined,
			cursor: url.searchParams.get('cursor') ?? undefined,
			lang: url.searchParams.get('lang') ?? undefined
		},
		runtimeConfig.defaultLanguage as LanguageKey
	);

	return json({
		ok: true,
		language: result.language,
		products: result.products,
		page: result.page
	});
});
