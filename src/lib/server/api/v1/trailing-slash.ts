/**
 * Every /api/v1 endpoint re-exports this as its `trailingSlash`.
 *
 * SvelteKit redirects a request whose trailing slash differs from the route's setting before any
 * hook runs, so `/api/v1/health/` would answer 308 even when the API is switched off, where a shop
 * without an API answers 404. Ignoring the slash lets the address reach the API middleware, which
 * answers for it exactly as for the address without a slash.
 */
export const trailingSlash = 'ignore';
