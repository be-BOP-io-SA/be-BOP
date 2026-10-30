import { runtimeConfig } from '$lib/server/runtime-config';

/** The allowlist entry that opens the API to every browser origin. */
export const API_V1_CORS_ANY_ORIGIN = '*';

/**
 * Normalize an origins list from runtime config, the admin form, or tests. Drops empties, and
 * collapses to a lone "*" when the wildcard is present — listing origins beside it says nothing.
 */
export function normalizeApiV1CorsOrigins(origins: readonly string[] | undefined | null): string[] {
	const cleaned = (origins ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
	return cleaned.includes(API_V1_CORS_ANY_ORIGIN) ? [API_V1_CORS_ANY_ORIGIN] : cleaned;
}

/**
 * Allowed origins from runtimeConfig.apiV1.corsOrigins — persisted in DB, edited in
 * Admin -> API Keys (super-admin). Single source of truth: no env fallback.
 * Empty → no cross-origin access. "*" → every browser origin.
 */
export function getApiV1AllowedOrigins(): string[] {
	return normalizeApiV1CorsOrigins(runtimeConfig.apiV1?.corsOrigins);
}

/**
 * The value to answer in `Access-Control-Allow-Origin`, or null to stay silent.
 *
 * The wildcard is safe here and only here: this API authenticates on `X-Api-Key`, a custom
 * header, so every cross-origin call is preflighted and a caller without the key gets a 401.
 * No cookie or other ambient credential is ever read, and `Access-Control-Allow-Credentials`
 * is never sent — which the Fetch spec requires for "*" to be legal at all. An allowlist adds
 * upkeep and outage risk without closing anything a key holder could not already do.
 */
export function resolveApiV1CorsOrigin(
	requestOrigin: string | null,
	allowed: string[] = getApiV1AllowedOrigins()
): string | null {
	if (allowed.includes(API_V1_CORS_ANY_ORIGIN)) {
		return API_V1_CORS_ANY_ORIGIN;
	}
	if (!requestOrigin) {
		return null;
	}
	return allowed.includes(requestOrigin) ? requestOrigin : null;
}

export function applyApiV1CorsHeaders(
	headers: Headers,
	requestOrigin: string | null,
	allowed?: string[]
): void {
	const origin = resolveApiV1CorsOrigin(requestOrigin, allowed ?? getApiV1AllowedOrigins());
	if (!origin) {
		return;
	}
	headers.set('Access-Control-Allow-Origin', origin);
	// Under the wildcard the answer is the same for everyone, so it does not vary by origin.
	if (origin !== API_V1_CORS_ANY_ORIGIN) {
		headers.set('Vary', 'Origin');
	}
	headers.set(
		'Access-Control-Allow-Headers',
		'Authorization, Content-Type, X-Api-Key, If-None-Match, Last-Event-ID'
	);
	// Without this a cross-origin caller cannot read the validator it needs to send back.
	headers.set('Access-Control-Expose-Headers', 'ETag, Retry-After');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	headers.set('Access-Control-Max-Age', '86400');
}

/** OPTIONS preflight → 204 with CORS headers when origin is allowlisted. */
export function apiV1OptionsResponse(request: Request): Response {
	const headers = new Headers();
	applyApiV1CorsHeaders(headers, request.headers.get('origin'));
	return new Response(null, { status: 204, headers });
}
