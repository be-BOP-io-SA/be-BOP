import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';

export { trailingSlash } from '$lib/server/api/v1/trailing-slash';
export const OPTIONS: RequestHandler = apiV1OptionsHandler;

export const GET: RequestHandler = apiV1Handler(async () => {
	return json({ ok: true, version: 'v1' });
});
