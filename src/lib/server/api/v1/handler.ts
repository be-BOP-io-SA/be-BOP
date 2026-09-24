import type { RequestEvent, RequestHandler } from '@sveltejs/kit';
import { applyApiV1CorsHeaders, apiV1OptionsResponse } from './cors';
import { apiError } from './errors';
import { errorCodeOf, isEventStream, logApiV1Event, readBodyForLog, truncateBody } from './log';

type ApiV1Inner = (event: RequestEvent) => Response | Promise<Response>;

/**
 * Wrap an /api/v1 route handler so CORS headers are applied once on every response,
 * including returned error envelopes and unexpected throws (mapped to INTERNAL_ERROR),
 * and so the call is written to the journal the shop reads in its admin.
 */
export function apiV1Handler(inner: ApiV1Inner): RequestHandler {
	return async (event) => {
		const origin = event.request.headers.get('origin');
		const startedAt = Date.now();
		// Cloned before the route reads it: a body is a stream, and only one reader may have it.
		const bodyForLog = readBodyForLog(event.request.clone());

		let response: Response;
		try {
			response = await inner(event);
			applyApiV1CorsHeaders(response.headers, origin);
		} catch (cause) {
			console.error('[api/v1] unhandled route error', cause);
			response = apiError(500, 'INTERNAL_ERROR', 'Internal server error');
			applyApiV1CorsHeaders(response.headers, origin);
		}

		void recordCall(event, response.clone(), await bodyForLog, startedAt);
		return response;
	};
}

/** Never throws: a journal that fails must not turn a good answer into a bad one. */
async function recordCall(
	event: RequestEvent,
	response: Response,
	requestBody: string | undefined,
	startedAt: number
): Promise<void> {
	try {
		const stream = isEventStream(response.headers.get('content-type'));
		// An event stream is still open at this point — reading it would wait for the shop to close.
		const responseBody = stream ? undefined : await readBodyForLog(response);

		const request = requestBody ? truncateBody(requestBody) : undefined;
		const answer = responseBody ? truncateBody(responseBody) : undefined;
		const apiKey = event.locals.apiKey;

		logApiV1Event({
			...(apiKey && {
				apiKeyId: apiKey._id,
				keyPrefix: apiKey.keyPrefix,
				keyName: apiKey.name
			}),
			method: event.request.method,
			path: event.url.pathname,
			...(event.url.search && { query: event.url.search.slice(1) }),
			status: response.status,
			durationMs: Date.now() - startedAt,
			...(errorCodeOf(answer?.body) && { errorCode: errorCodeOf(answer?.body) }),
			...(event.locals.clientIp && { clientIp: event.locals.clientIp }),
			...(event.request.headers.get('user-agent') && {
				userAgent: event.request.headers.get('user-agent') as string
			}),
			...(request && { requestBody: request.body }),
			...(answer && { responseBody: answer.body }),
			...((request?.truncated || answer?.truncated) && { truncated: true }),
			...(stream && { stream: true })
		});
	} catch (err) {
		console.error('[api/v1] could not record the call', err);
	}
}

export const apiV1OptionsHandler: RequestHandler = async ({ request }) =>
	apiV1OptionsResponse(request);
