import type { RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { checkRateLimit } from '$lib/server/rateLimit';
import { toPaidOrderDto } from '$lib/server/api/v1/orders/listPaid';
import { openPaidOrderStream } from '$lib/server/api/v1/orders/paidStreamConnection';
import {
	encodeStreamCursor,
	paidOrderFingerprint,
	parseStreamCursor,
	parseStreamSince
} from '$lib/server/api/v1/orders/paidStream';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/**
 * Paid orders as Server-Sent Events, in this surface's own vocabulary: the `PaidOrderDto` the JSON
 * poll returns, and an opaque resume cursor rather than an order id.
 *
 * The PoS seam streams the same feed with its own framing at `/api/v1/pos/orders`.
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

	const since = parseStreamSince(
		event.url.searchParams.get('since_ts') ?? undefined,
		event.url.searchParams.get('since') ?? undefined
	);
	if ('error' in since) {
		return apiError(400, 'VALIDATION_ERROR', since.error.message, { field: since.error.field });
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
		signal: event.request.signal,
		since: since.date,
		after: resumeFrom,
		render: (order, cursor) => {
			const dto = toPaidOrderDto(order);
			if (!dto) {
				return null;
			}
			return {
				id: encodeStreamCursor(cursor),
				data: dto,
				fingerprint: paidOrderFingerprint(dto)
			};
		}
	});
});
