import type { RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { checkRateLimit } from '$lib/server/rateLimit';
import { toOrderReadDto } from '$lib/server/api/v1/orders/listPaid';
import { openPaidOrderStream } from '$lib/server/api/v1/orders/paidStreamConnection';
import { encodeStreamCursor, parseStreamCursor } from '$lib/server/api/v1/orders/paidStream';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/**
 * Orders as Server-Sent Events, each time a note or a label is put on one or its personal data is
 * erased. It speaks the same `OrderReadDto` as `GET /api/v1/orders`.
 *
 * Those writes leave the sale as it was, so `/api/v1/orders/paid/stream` and
 * `/api/v1/orders/stream` do not announce them: a device that acts on a sale never sees the same
 * sale twice. A system that needs them subscribes here.
 */
export const GET: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'orders:stream');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	const apiKey = apiKeyOrError;

	const limit = checkRateLimit(apiKey._id.toString(), 'api.v1.orders.stream', 30, { minutes: 1 });
	if (limit.limited) {
		return apiError(
			429,
			'RATE_LIMITED',
			'Too many stream connections for this API key',
			undefined,
			{
				'Retry-After': String(limit.retryAfterSeconds)
			}
		);
	}

	// EventSource replays the last id in a header; a fetch-driven client uses the query parameter.
	const rawLastEventId =
		event.request.headers.get('last-event-id') ?? event.url.searchParams.get('last_event_id');
	const resumeFrom = parseStreamCursor(rawLastEventId);
	if (rawLastEventId && !resumeFrom) {
		return apiError(
			400,
			'VALIDATION_ERROR',
			'Last-Event-ID is not a cursor issued by this stream',
			{
				field: 'Last-Event-ID'
			}
		);
	}

	return openPaidOrderStream({
		keyId: apiKey._id.toString(),
		maxConcurrentStreams: apiKey.maxConcurrentStreams,
		lifetimeSeconds: apiKey.streamLifetimeSeconds,
		...(apiKey.ownOrdersOnly && { ordersOfKey: apiKey._id }),
		signal: event.request.signal,
		after: resumeFrom,
		feed: 'annotations',
		render: (order, cursor) => {
			const dto = toOrderReadDto(order);
			return {
				id: encodeStreamCursor(cursor),
				data: dto,
				fingerprint: dto.orderId
			};
		}
	});
});
