import { json, text } from '@sveltejs/kit';

/**
 * SvelteKit's protection against cross-site form submissions, applied by be-BOP itself so that
 * the API v1 can be left out: svelte.config.js turns SvelteKit's own check off.
 *
 * The API v1 authenticates with an API key in a header, never with a cookie, so a form posted
 * from another site cannot act as anyone there. SvelteKit refused, however, a POST from an app
 * without an `Origin` header whose HTTP client added a form content type to an empty body: the
 * be-BOP-pos app asking for its Stripe connection token.
 */
const FORM_CONTENT_TYPES = [
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain',
	// SvelteKit's own binary form encoding.
	'application/x-sveltekit-formdata'
];
const UNSAFE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/** The refusal SvelteKit sends for a cross-site form submission, or nothing if it is allowed. */
export function refuseCrossSiteForm(request: Request, url: URL): Response | undefined {
	if (!UNSAFE_METHODS.includes(request.method)) {
		return;
	}
	const type = (request.headers.get('content-type') ?? '').split(';', 1)[0].trim().toLowerCase();
	if (!FORM_CONTENT_TYPES.includes(type) || request.headers.get('origin') === url.origin) {
		return;
	}
	const message = `Cross-site ${request.method} form submissions are forbidden`;
	return request.headers.get('accept') === 'application/json'
		? json({ message }, { status: 403 })
		: text(message, { status: 403 });
}
