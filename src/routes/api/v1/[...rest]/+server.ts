import type { RequestHandler } from '@sveltejs/kit';
import { apiV1Handler } from '$lib/server/api/v1/handler';
import { apiNotFound } from '$lib/server/api/v1/errors';

export { trailingSlash } from '$lib/server/api/v1/trailing-slash';

/**
 * Every /api/v1 address that no other route owns, for every method. Without it the router falls
 * through to the site's own pages, and a wrong path answers a web page with a 200, which an
 * integration takes for a success. SvelteKit ranks a rest parameter below any real route, so this
 * only ever answers what nothing else does.
 */
export const fallback: RequestHandler = apiV1Handler(async () => apiNotFound());
