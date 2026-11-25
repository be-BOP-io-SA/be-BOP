import { json, type RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { runtimeConfig } from '$lib/server/runtime-config';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/** What a be-BOP-pos terminal calls to check that it is paired: its key and the shop it reaches. */
export const GET: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'pos:read');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}

	return json({
		ok: true,
		device: { name: apiKeyOrError.name },
		shop: { name: runtimeConfig.brandName }
	});
});
