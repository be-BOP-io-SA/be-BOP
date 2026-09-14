import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { applyApiV1CorsHeaders, apiV1OptionsResponse } from './cors';
import { apiError } from './errors';

type ApiV1Inner = (event: RequestEvent) => Response | Promise<Response>;

/**
 * Wrap an /api/v1 route handler so CORS headers are applied once on every response,
 * including returned error envelopes and unexpected throws (mapped to INTERNAL_ERROR).
 */
export function apiV1Handler(inner: ApiV1Inner): RequestHandler {
	return async (event) => {
		const origin = event.request.headers.get('origin');
		try {
			const response = await inner(event);
			applyApiV1CorsHeaders(response.headers, origin);
			return response;
		} catch (cause) {
			console.error('[api/v1] unhandled route error', cause);
			const response = apiError(500, 'INTERNAL_ERROR', 'Internal server error');
			applyApiV1CorsHeaders(response.headers, origin);
			return response;
		}
	};
}

export const apiV1OptionsHandler: RequestHandler = async ({ request }) =>
	apiV1OptionsResponse(request);
