import { collections } from '$lib/server/database';
import type { Order } from '$lib/types/Order';
import type { OrderQueryError, PaidOrderDto } from './listPaid';

/** Heartbeat cadence. Must stay under the 30s the seam allows between comment frames. */
export const SSE_HEARTBEAT_MS = 25_000;
/** `retry:` hint sent once at stream open — how long a client waits before reconnecting. */
export const SSE_RETRY_MS = 5_000;
/** Rows per backfill round-trip. Frames are yielded as they come, never buffered whole. */
export const BACKFILL_BATCH = 200;

/**
 * Resume position.
 *
 * Keyed on `updatedAt`, which moves forward when a payment is confirmed. Not on `_id`: an order
 * `_id` is a crypto UUID and sorts at random, so it cannot express "everything after this point".
 * `orderId` breaks ties inside the same millisecond.
 */
export type PaidStreamCursor = { ms: number; orderId: string };

export function encodeStreamCursor(cursor: PaidStreamCursor): string {
	return `${cursor.ms}:${cursor.orderId}`;
}

export function parseStreamCursor(raw: string | null | undefined): PaidStreamCursor | null {
	if (!raw) {
		return null;
	}
	const separator = raw.indexOf(':');
	if (separator <= 0) {
		return null;
	}
	const msPart = raw.slice(0, separator);
	const orderId = raw.slice(separator + 1);
	const ms = Number.parseInt(msPart, 10);
	if (!Number.isSafeInteger(ms) || ms < 0 || String(ms) !== msPart || !orderId) {
		return null;
	}
	return { ms, orderId };
}

export function orderStreamCursor(order: Order): PaidStreamCursor {
	const at = order.updatedAt ?? order.createdAt;
	return { ms: at.getTime(), orderId: order._id };
}

/** Total order over (ms, orderId) so a resume can skip exactly what was already delivered. */
export function compareCursors(a: PaidStreamCursor, b: PaidStreamCursor): number {
	if (a.ms !== b.ms) {
		return a.ms < b.ms ? -1 : 1;
	}
	if (a.orderId === b.orderId) {
		return 0;
	}
	return a.orderId < b.orderId ? -1 : 1;
}

/**
 * Dedupe key for at-least-once delivery. Equal for a re-delivery of an unchanged order, different
 * when a further payment moves the amount.
 */
export function paidOrderFingerprint(dto: PaidOrderDto): string {
	return `${dto.orderId}|${dto.amountPaid.amountMinor}|${dto.amountPaid.currency}|${dto.paidAt}|${dto.items.length}`;
}

export function sseComment(text: string): string {
	return `:${text}\n\n`;
}

export function sseEvent(id: string, data: unknown): string {
	return `id: ${id}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * A resume point ahead of the server's clock replays nothing, which on a feed means losing every
 * event until the client's clock is fixed — a silent, permanent gap. A till whose clock runs fast,
 * or which mishandles a daylight-saving change, produces exactly that. Clamping costs at most a
 * few duplicate events, which the caller deduplicates anyway.
 *
 * `last_event_id` carries no timestamp and is immune to this; prefer it whenever one is available.
 */
function clampToNow(date: Date): Date {
	const now = Date.now();
	return date.getTime() > now ? new Date(now) : date;
}

/**
 * `since_ts` is epoch seconds, `since` is ISO 8601. Null means no backfill: start at the live edge.
 * Either is clamped to the server's clock — see `clampToNow`.
 */
export function parseStreamSince(
	sinceTs: string | undefined,
	sinceIso: string | undefined
): { date: Date | null } | { error: OrderQueryError } {
	if (sinceTs !== undefined && sinceTs.trim() !== '') {
		const trimmed = sinceTs.trim();
		const seconds = Number.parseInt(trimmed, 10);
		if (!Number.isSafeInteger(seconds) || seconds < 0 || String(seconds) !== trimmed) {
			return {
				error: {
					field: 'since_ts',
					message: 'since_ts must be a whole number of seconds since the Unix epoch'
				}
			};
		}
		return { date: clampToNow(new Date(seconds * 1000)) };
	}
	if (sinceIso !== undefined && sinceIso.trim() !== '') {
		const date = new Date(sinceIso);
		if (Number.isNaN(date.getTime())) {
			return { error: { field: 'since', message: 'since must be an ISO 8601 date-time' } };
		}
		return { date: clampToNow(date) };
	}
	return { date: null };
}

export type PaidStreamFrame = { cursor: PaidStreamCursor; order: Order };

/**
 * Where an order sits in the stream, for a caller resuming by order id rather than by cursor.
 * Null for an unknown id — the caller then starts at the live edge.
 */
export async function findOrderCursor(orderId: string): Promise<PaidStreamCursor | null> {
	const doc = await collections.orders.findOne(
		{ _id: orderId },
		{ projection: { updatedAt: 1, createdAt: 1 } }
	);
	return doc ? orderStreamCursor(doc as Order) : null;
}

/**
 * Replay paid orders from `since` / `after`, oldest first, in batches.
 *
 * Yields rather than collecting: a long backlog is written out under backpressure instead of being
 * held in memory.
 */
export async function* iteratePaidOrderBacklog(opts: {
	since: Date | null;
	after: PaidStreamCursor | null;
}): AsyncGenerator<PaidStreamFrame> {
	const floor = Math.max(opts.since?.getTime() ?? 0, opts.after?.ms ?? 0);
	let lowerBoundMs = floor;
	let after = opts.after;

	for (;;) {
		const docs = await collections.orders
			.find({ 'payments.status': 'paid', updatedAt: { $gte: new Date(lowerBoundMs) } })
			.sort({ updatedAt: 1, _id: 1 })
			.limit(BACKFILL_BATCH)
			.toArray();

		let advanced = false;
		for (const doc of docs) {
			const order = doc as Order;
			const cursor = orderStreamCursor(order);
			if (after && compareCursors(cursor, after) <= 0) {
				continue;
			}
			after = cursor;
			advanced = true;
			yield { cursor, order };
		}

		if (docs.length < BACKFILL_BATCH) {
			return;
		}
		// A full batch with nothing new means every row tied on the cursor's millisecond. Stepping
		// past it is the only exit, and can only skip rows already delivered.
		lowerBoundMs = advanced ? after?.ms ?? lowerBoundMs : lowerBoundMs + 1;
	}
}
