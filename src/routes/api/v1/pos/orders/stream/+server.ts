import type { RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { checkRateLimit } from '$lib/server/rateLimit';
import { openPaidOrderStream } from '$lib/server/api/v1/orders/paidStreamConnection';
import { findOrderCursor, parseStreamSince } from '$lib/server/api/v1/orders/paidStream';
import { toPosPaidOrderEvent } from '$lib/server/api/v1/pos/paidEvents';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/**
 * Paid orders as Server-Sent Events, in the seam's framing.
 *
 * The same feed as the JSON poll on `/api/v1/pos/orders`, with the same `since_ts` and
 * `last_event_id` vocabulary — a client that cannot hold a connection open falls back to the poll
 * without relearning anything.
 *
 * The `id:` line carries the order id, which is what a consumer deduplicates on. Both resume hints
 * are advisory: an unknown `Last-Event-ID` starts the stream at the live edge rather than failing.
 */
export const GET: RequestHandler = apiV1Handler(async (event) => {
	const apiKeyOrError = await requireApiKey(event, 'pos:stream');
	if (apiKeyOrError instanceof Response) {
		return apiKeyOrError;
	}
	const apiKey = apiKeyOrError;

	const limit = checkRateLimit(apiKey._id.toString(), 'api.v1.pos.stream', 30, { minutes: 1 });
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

	const since = parseStreamSince(event.url.searchParams.get('since_ts') ?? undefined, undefined);
	if ('error' in since) {
		return apiError(400, 'VALIDATION_ERROR', since.error.message, { field: since.error.field });
	}

	const lastEventId =
		event.request.headers.get('last-event-id') ?? event.url.searchParams.get('last_event_id');
	const after = lastEventId ? await findOrderCursor(lastEventId.trim()) : null;

	// Naming a tag narrows the feed to orders carrying a line tagged with it, and reduces `amount`
	// to that line. be-BOP holds no domain word: the caller says which tag it means.
	const tag = event.url.searchParams.get('tag')?.trim() || undefined;

	return openPaidOrderStream({
		keyId: apiKey._id.toString(),
		signal: event.request.signal,
		since: since.date,
		after,
		render: (order) => {
			const paidEvent = toPosPaidOrderEvent(order, tag);
			if (!paidEvent) {
				return null;
			}
			return {
				id: paidEvent.orderId,
				data: paidEvent,
				// The payload is small enough to be its own dedupe key.
				fingerprint: JSON.stringify(paidEvent)
			};
		}
	});
});
