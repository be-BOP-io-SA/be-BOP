import type { Handle } from '@sveltejs/kit';
import { countryFromIp } from '$lib/server/geoip';
import { checkRateLimit } from '$lib/server/rateLimit';
import { runtimeConfig } from '$lib/server/runtime-config';
import { toIPv4Maybe } from '$lib/server/utils/toIPv4Maybe';
import type { LanguageKey } from '$lib/translations';
import { applyApiV1CorsHeaders } from './cors';
import { apiError } from './errors';

/** Public meta endpoints kept up during maintenance (health / contract / docs only). */
export function isApiV1PublicReadGet(pathname: string): boolean {
	return (
		pathname === '/api/v1/health' ||
		pathname === '/api/v1/openapi.json' ||
		pathname === '/api/v1/docs' ||
		pathname === '/api/v1/docs/'
	);
}

/**
 * Public HTTP API v1 handle — isolated from SSO/session handlers.
 *
 * Maintenance: GET health / openapi.json / docs and OPTIONS stay up.
 * All other /api/v1 routes (authenticated writes/reads) → 503.
 * IP safety net skips those same public meta GETs and OPTIONS.
 */
export const handleApiV1: Handle = async ({ event, resolve }) => {
	try {
		event.locals.clientIp = toIPv4Maybe(event.getClientAddress());
	} catch {
		/* getClientAddress can throw when not behind a trusted proxy */
	}
	event.locals.countryCode = event.locals.clientIp
		? countryFromIp(event.locals.clientIp)
		: undefined;
	event.locals.language = runtimeConfig.defaultLanguage as LanguageKey;

	const origin = event.request.headers.get('origin');
	const withCors = (response: Response) => {
		applyApiV1CorsHeaders(response.headers, origin);
		return response;
	};

	const method = event.request.method.toUpperCase();
	const isPublicReadGet = method === 'GET' && isApiV1PublicReadGet(event.url.pathname);
	const isOptions = method === 'OPTIONS';

	if (runtimeConfig.isMaintenance && !isPublicReadGet && !isOptions) {
		return withCors(
			apiError(503, 'MAINTENANCE', 'Site is in maintenance mode. Please try again later.')
		);
	}

	// IP safety net: skip public GETs and CORS preflights so monitors / docs / PoS preflights
	// are not starved by the write-path bucket.
	if (!isPublicReadGet && !isOptions) {
		const limit = checkRateLimit(event.locals.clientIp ?? 'unknown-ip', 'api.v1.ip', 120, {
			minutes: 1
		});
		if (limit.limited) {
			return withCors(
				apiError(429, 'RATE_LIMITED', 'Too many requests from this IP', undefined, {
					'Retry-After': String(limit.retryAfterSeconds)
				})
			);
		}
	}

	return resolve(event);
};
