import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { buildOpenApiDocument } from '$lib/server/api/v1/openapi';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

export const GET: RequestHandler = apiV1Handler(async ({ url }) => {
	const doc = buildOpenApiDocument({ serverUrl: url.origin });
	return json(doc);
});
