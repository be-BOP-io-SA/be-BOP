import type { RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { checkRateLimit } from '$lib/server/rateLimit';
import { toOrderReadDto } from '$lib/server/api/v1/orders/listPaid';
import { openPaidOrderStream } from '$lib/server/api/v1/orders/paidStreamConnection';
import {
	encodeStreamCursor,
	parseStreamCursor,
	parseStreamSince
} from '$lib/server/api/v1/orders/paidStream';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/**
 * Every order as Server-Sent Events, whatever its payments are worth: the streaming counterpart of
 * `GET /api/v1/orders`, and it speaks the same `OrderReadDto`.
 *
 * `/api/v1/orders/paid/stream` stays the narrow feed. A till that only cares about takings should
 * keep using it: this one also announces an order created pending, one that failed, and each
 * further write on them.
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
		anyStatus: true,
		render: (order, cursor) => {
			const dto = toOrderReadDto(order);
			return {
				id: encodeStreamCursor(cursor),
				data: dto,
				// The status is what moves on an unpaid order, so it takes part in the dedupe key.
				fingerprint: `${dto.orderId}|${dto.status}|${dto.amountPaid.amountMinor}|${dto.amountPaid.currency}|${dto.paidAt}|${dto.items.length}`
			};
		}
	});
});
