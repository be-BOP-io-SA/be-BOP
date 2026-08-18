import { runtimeConfig } from '$lib/server/runtime-config';

/**
 * Normalize an origins list from runtime config, the admin form, or tests. Drops "*" and empties.
 */
export function normalizeApiV1CorsOrigins(origins: readonly string[] | undefined | null): string[] {
	return (origins ?? []).map((s) => s.trim()).filter((s) => s.length > 0 && s !== '*');
}

/**
 * Allowed origins from runtimeConfig.apiV1.corsOrigins — persisted in DB, edited in
 * Admin -> API Keys (super-admin). Single source of truth: no env fallback.
 * Empty → no cross-origin access (never "*").
 */
export function getApiV1AllowedOrigins(): string[] {
	return normalizeApiV1CorsOrigins(runtimeConfig.apiV1?.corsOrigins);
}

export function resolveApiV1CorsOrigin(
	requestOrigin: string | null,
	allowed: string[] = getApiV1AllowedOrigins()
): string | null {
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
	headers.set('Vary', 'Origin');
	headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Api-Key');
	headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	headers.set('Access-Control-Max-Age', '86400');
}

/** OPTIONS preflight → 204 with CORS headers when origin is allowlisted. */
export function apiV1OptionsResponse(request: Request): Response {
	const headers = new Headers();
	applyApiV1CorsHeaders(headers, request.headers.get('origin'));
	return new Response(null, { status: 204, headers });
}
