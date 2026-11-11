import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Order } from '$lib/types/Order';
import type { ObjectId } from 'mongodb';
import type { OrderQueryError, PaidOrderDto } from './listPaid';

/** Heartbeat cadence. Must stay under the 30s the seam allows between comment frames. */
export const SSE_HEARTBEAT_MS = 25_000;
/** `retry:` hint sent once at stream open — how long a client waits before reconnecting. */
export const SSE_RETRY_MS = 5_000;
/** Rows per backfill round-trip. Frames are yielded as they come, never buffered whole. */
export const BACKFILL_BATCH = 200;

/**
 * Which share of the orders a stream follows.
 *
 * `paid`: orders with a paid payment, on each change of the order itself. `all`: every order, on
 * each change of the order itself. `annotations`: every order, each time a note or a label is put on
 * it or its personal data is erased — and only then.
 */
export type OrderFeed = 'paid' | 'all' | 'annotations';

/** The date a feed resumes on: annotations move `annotatedAt`, every other write `updatedAt`. */
function feedDateField(feed: OrderFeed): 'updatedAt' | 'annotatedAt' {
	return feed === 'annotations' ? 'annotatedAt' : 'updatedAt';
}

/**
 * Resume position.
 *
 * Keyed on `updatedAt` (`annotatedAt` for the annotations feed), which moves forward when a payment
 * is confirmed. Not on `_id`: an order
 * `_id` is a crypto UUID and sorts at random, so it cannot express "everything after this point".
 * `orderId` breaks ties inside the same millisecond.
 */
export type PaidStreamCursor = { ms: number; orderId: string };

/** Whom a cursor was issued to: it only resumes the same feed, for the same API key. */
export type StreamCursorScope = { keyId: string; feed: OrderFeed };

const CURSOR_SIGNING_PURPOSE = 'bebop-api-v1-stream-cursor-v1';
/** Stands in until the shop has its signing key: cursors then hold for the life of the process. */
const PROCESS_SIGNING_KEY = randomBytes(32).toString('hex');

function cursorSigningKey(): string {
	const appSecret = runtimeConfig.authLinkJwtSigningKey?.trim() || PROCESS_SIGNING_KEY;
	return createHmac('sha256', appSecret).update(CURSOR_SIGNING_PURPOSE, 'utf8').digest('hex');
}

function cursorSignature(cursor: PaidStreamCursor, scope: StreamCursorScope): string {
	return createHmac('sha256', cursorSigningKey())
		.update(`${scope.feed}|${scope.keyId}|${cursor.ms}|${cursor.orderId}`, 'utf8')
		.digest('base64url');
}

/**
 * The cursor is signed. It carries a date, and a stream only resumes after an event it actually
 * sent: a cursor made up by hand, with an older date, would otherwise replay the shop's history to
 * a key that is only allowed to follow it from now on.
 */
export function encodeStreamCursor(cursor: PaidStreamCursor, scope: StreamCursorScope): string {
	return `${cursor.ms}:${cursor.orderId}:${cursorSignature(cursor, scope)}`;
}

/** Null for anything this stream did not issue to this key — unsigned, altered or foreign. */
export function parseStreamCursor(
	raw: string | null | undefined,
	scope: StreamCursorScope
): PaidStreamCursor | null {
	if (!raw) {
		return null;
	}
	const first = raw.indexOf(':');
	const last = raw.lastIndexOf(':');
	if (first <= 0 || last <= first) {
		return null;
	}
	const msPart = raw.slice(0, first);
	const orderId = raw.slice(first + 1, last);
	const signature = raw.slice(last + 1);
	const ms = Number.parseInt(msPart, 10);
	if (!Number.isSafeInteger(ms) || ms < 0 || String(ms) !== msPart || !orderId || !signature) {
		return null;
	}
	const expected = Buffer.from(cursorSignature({ ms, orderId }, scope));
	const received = Buffer.from(signature);
	if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
		return null;
	}
	return { ms, orderId };
}

export function orderStreamCursor(order: Order, feed: OrderFeed = 'paid'): PaidStreamCursor {
	const at = (feed === 'annotations' ? order.annotatedAt : order.updatedAt) ?? order.createdAt;
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
export async function findOrderCursor(
	orderId: string,
	feed: OrderFeed = 'paid'
): Promise<PaidStreamCursor | null> {
	const doc = await collections.orders.findOne(
		{ _id: orderId },
		{ projection: { updatedAt: 1, annotatedAt: 1, createdAt: 1 } }
	);
	return doc ? orderStreamCursor(doc as Order, feed) : null;
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
	/** Which orders to replay. Paid ones when absent. */
	feed?: OrderFeed;
	/** Only the orders written with this API key. Undefined means every order. */
	ordersOfKey?: ObjectId;
}): AsyncGenerator<PaidStreamFrame> {
	const feed = opts.feed ?? 'paid';
	const field = feedDateField(feed);
	const floor = Math.max(opts.since?.getTime() ?? 0, opts.after?.ms ?? 0);
	let lowerBoundMs = floor;
	let after = opts.after;

	for (;;) {
		const docs = await collections.orders
			.find({
				...(feed === 'paid' && { 'payments.status': 'paid' }),
				...(opts.ordersOfKey && { externalSourceApiKeyId: opts.ordersOfKey }),
				[field]: { $gte: new Date(lowerBoundMs) }
			})
			.sort({ [field]: 1, _id: 1 })
			.limit(BACKFILL_BATCH)
			.toArray();

		let advanced = false;
		for (const doc of docs) {
			const order = doc as Order;
			const cursor = orderStreamCursor(order, feed);
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
