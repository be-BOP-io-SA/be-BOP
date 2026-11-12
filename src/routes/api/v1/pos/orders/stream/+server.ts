import type { RequestHandler } from '@sveltejs/kit';
import { apiV1Handler, apiV1OptionsHandler } from '$lib/server/api/v1/handler';
import { requireApiKey } from '$lib/server/api/v1/auth';
import { apiError } from '$lib/server/api/v1/errors';
import { checkRateLimit } from '$lib/server/rateLimit';
import { openPaidOrderStream } from '$lib/server/api/v1/orders/paidStreamConnection';
import { findOrderCursor } from '$lib/server/api/v1/orders/paidStream';
import { parseApiQuery, textParam } from '$lib/server/api/v1/query';
import { toPosPaidOrderEvent } from '$lib/server/api/v1/pos/paidEvents';

export const OPTIONS: RequestHandler = apiV1OptionsHandler;

/**
 * Paid orders as Server-Sent Events, in the seam's framing.
 *
 * The same feed as the JSON poll on `/api/v1/pos/orders`, with the same `last_event_id`
 * vocabulary. A stream carries what happens from now on: it resumes after the last event the
 * client received, and history, from a date, is read from the poll.
 *
 * The `id:` line carries the order id, which is what a consumer deduplicates on. The resume hint is
 * advisory: an unknown `Last-Event-ID` starts the stream at the live edge rather than failing.
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

	const query = parseApiQuery(event.url, {
		last_event_id: textParam,
		// Naming a tag narrows the feed to orders carrying a line tagged with it, and reduces
		// `amount` to that line. be-BOP holds no domain word: the caller says which tag it means.
		tag: textParam
	});
	if ('error' in query) {
		return query.error;
	}
	const lastEventId =
		event.request.headers.get('last-event-id')?.trim() || query.data.last_event_id;
	const after = lastEventId ? await findOrderCursor(lastEventId) : null;
	const tag = query.data.tag;

	return openPaidOrderStream({
		keyId: apiKey._id.toString(),
		maxConcurrentStreams: apiKey.maxConcurrentStreams,
		lifetimeSeconds: apiKey.streamLifetimeSeconds,
		...(apiKey.ownOrdersOnly && { ordersOfKey: apiKey._id }),
		signal: event.request.signal,
		after,
		feed: 'paid',
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
