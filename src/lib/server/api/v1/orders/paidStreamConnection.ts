import { apiError } from '../errors';
import type { Order } from '$lib/types/Order';
import type { ObjectId } from 'mongodb';
import {
	subscribeToAllOrders,
	subscribeToOrderAnnotations,
	subscribeToPaidOrders
} from './paidStreamHub';
import {
	SSE_HEARTBEAT_MS,
	SSE_RETRY_MS,
	iteratePaidOrderBacklog,
	orderStreamCursor,
	sseComment,
	sseEvent,
	type OrderFeed,
	type PaidStreamCursor
} from './paidStream';

/** Live events waiting to be written out. Past this the client is too slow to keep up. */
const MAX_PENDING_EVENTS = 1_000;
/** Fingerprints retained for dedupe. Bounded so a stream open for weeks cannot grow unbounded. */
const MAX_SEEN_FINGERPRINTS = 5_000;

/**
 * Streams currently open with each key, each one held by the function that closes it. The size of
 * a key's set is the number of places it takes against its budget.
 */
const activeStreamsByKey = new Map<string, Set<() => void>>();

/** Places currently held by one key. Read on the key's admin page; triggers no call of its own. */
export function countOpenStreams(keyId: string): number {
	return activeStreamsByKey.get(keyId)?.size ?? 0;
}

/**
 * Close every stream open with one key, and give its places back at once.
 *
 * This is the recovery for a budget wedged shut by streams nobody is reading any more, and the way
 * to cut a key off its feeds right away. A device that is still listening sees its stream end, and
 * reconnects as it does at the end of a lifetime, if the key still lets it.
 */
export function closeStreamsOfKey(keyId: string): void {
	const closers = activeStreamsByKey.get(keyId);
	// Each closer removes itself from the set: iterate over a copy.
	for (const close of [...(closers ?? [])]) {
		close();
	}
	activeStreamsByKey.delete(keyId);
}

/** What one paid order looks like on the wire, for the surface asking. */
export type PaidStreamFraming = {
	/** The SSE `id:` line. */
	id: string;
	/** The SSE `data:` line, JSON-serialized. */
	data: unknown;
	/**
	 * Dedupe key — equal payloads for the same order must produce equal fingerprints. The order's
	 * revision is added by the connection, so a surface never has to hash fields it does not send.
	 */
	fingerprint: string;
};

export type PaidStreamOptions = {
	/** API key id, for the per-credential connection budget. */
	keyId: string;
	/**
	 * Streams this key may hold open at once, across every stream surface. Undefined means no
	 * ceiling — the number is a setting of the key, never compiled in here.
	 */
	maxConcurrentStreams?: number;
	/**
	 * Seconds this stream stays open before the server closes it. Undefined means it never does.
	 *
	 * This is what returns a place in practice. The abort signal below looks like it should do the
	 * job, and it cannot: SvelteKit's Node adapter builds the incoming Request without a signal, so
	 * the one a route hands over is an object nothing ever aborts. A device that stops answering
	 * therefore never gives its place back, and a fleet of a dozen fills any budget.
	 */
	lifetimeSeconds?: number;
	signal?: AbortSignal;
	/**
	 * Replay strictly after this position — the last event the client received. Null starts at the
	 * live edge: a stream carries what happens from now on, and history is read from the listings.
	 */
	after: PaidStreamCursor | null;
	/** Which orders this stream follows. */
	feed: OrderFeed;
	/**
	 * Only the orders written with this API key, for a key restricted to its own orders. Undefined
	 * means every order.
	 */
	ordersOfKey?: ObjectId;
	/** Null skips the order — nothing to announce for it on this surface. */
	render: (order: Order, cursor: PaidStreamCursor) => PaidStreamFraming | null;
};

/**
 * Open a Server-Sent Events response over the paid-order feed.
 *
 * Handles subscription, backfill, ordering, backpressure and teardown; the caller supplies only the
 * framing.
 */
export function openPaidOrderStream(options: PaidStreamOptions): Response {
	const { keyId } = options;

	const budget = options.maxConcurrentStreams;
	const openStreams = activeStreamsByKey.get(keyId) ?? new Set<() => void>();
	// Refused before the place is taken, so a stream turned away costs the key nothing.
	if (budget !== undefined && openStreams.size >= budget) {
		return apiError(
			429,
			'RATE_LIMITED',
			`At most ${budget} concurrent streams per API key`,
			undefined,
			{ 'Retry-After': '5' }
		);
	}
	openStreams.add(cleanup);
	activeStreamsByKey.set(keyId, openStreams);

	// A Response body is a byte stream; encoding here keeps frame boundaries where SSE puts them.
	const encoder = new TextEncoder();
	const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
	let writer: WritableStreamDefaultWriter<Uint8Array> | null = writable.getWriter();
	let unsubscribe: (() => void) | null = null;
	let heartbeat: ReturnType<typeof setInterval> | null = null;
	let expiry: ReturnType<typeof setTimeout> | null = null;
	let closed = false;

	const pending: Order[] = [];
	const seen = new Map<string, true>();
	const replaying = options.after !== null;
	// Held until the preamble and any backlog are written, so no frame overtakes the replay.
	let holdingLiveEvents = true;
	let draining = false;

	function cleanup(): void {
		if (closed) {
			return;
		}
		closed = true;
		unsubscribe?.();
		unsubscribe = null;
		if (heartbeat) {
			clearInterval(heartbeat);
			heartbeat = null;
		}
		if (expiry) {
			clearTimeout(expiry);
			expiry = null;
		}
		writer?.close().catch(() => undefined);
		writer = null;
		const remaining = activeStreamsByKey.get(keyId);
		remaining?.delete(cleanup);
		if (remaining && !remaining.size) {
			activeStreamsByKey.delete(keyId);
		}
	}

	/** Every frame goes through here, so a failed write tears the connection down exactly once. */
	async function push(frame: string): Promise<boolean> {
		if (!writer) {
			return false;
		}
		try {
			await writer.ready;
			await writer.write(encoder.encode(frame));
			return true;
		} catch {
			cleanup();
			return false;
		}
	}

	function remember(fingerprint: string): void {
		seen.set(fingerprint, true);
		if (seen.size > MAX_SEEN_FINGERPRINTS) {
			const oldest = seen.keys().next();
			if (!oldest.done) {
				seen.delete(oldest.value);
			}
		}
	}

	async function emit(order: Order, cursor: PaidStreamCursor): Promise<boolean> {
		const framing = options.render(order, cursor);
		if (!framing) {
			return true;
		}
		/**
		 * A sale is announced on the paid feed once: a further write that leaves what was paid as it
		 * was is a re-delivery, filtered on the surface's own fingerprint. The other feeds announce
		 * each revision, so the date the feed resumes on is part of their key.
		 */
		const key =
			options.feed === 'paid' ? framing.fingerprint : `${cursor.ms}|${framing.fingerprint}`;
		if (seen.has(key)) {
			return true;
		}
		remember(key);
		return push(sseEvent(framing.id, framing.data));
	}

	/** Single writer: frames must leave in cursor order, so one loop drains the queue. */
	async function drain(): Promise<void> {
		if (draining || holdingLiveEvents) {
			return;
		}
		draining = true;
		try {
			while (pending.length && !closed) {
				const order = pending.shift();
				if (order && !(await emit(order, orderStreamCursor(order, options.feed)))) {
					return;
				}
			}
		} finally {
			draining = false;
		}
	}

	// Subscribed before the backfill, so an order paid mid-read cannot fall between snapshot and
	// live edge.
	const subscribe =
		options.feed === 'annotations'
			? subscribeToOrderAnnotations
			: options.feed === 'all'
			? subscribeToAllOrders
			: subscribeToPaidOrders;
	const ordersOfKey = options.ordersOfKey?.toString();
	unsubscribe = subscribe((order) => {
		if (closed) {
			return;
		}
		if (ordersOfKey && order.externalSourceApiKeyId?.toString() !== ordersOfKey) {
			return;
		}
		if (pending.length >= MAX_PENDING_EVENTS) {
			// The client is not reading. Closing makes it reconnect and replay; dropping frames would
			// strand it silently.
			void push(sseComment('overflow')).finally(cleanup);
			return;
		}
		pending.push(order);
		void drain();
	});

	void (async () => {
		if (!(await push(`retry: ${SSE_RETRY_MS}\n\n`))) {
			return;
		}
		if (!(await push(sseComment('ok')))) {
			return;
		}
		if (replaying) {
			try {
				for await (const frame of iteratePaidOrderBacklog({
					since: null,
					after: options.after,
					feed: options.feed,
					...(options.ordersOfKey && { ordersOfKey: options.ordersOfKey })
				})) {
					if (closed) {
						return;
					}
					if (!(await emit(frame.order, frame.cursor))) {
						return;
					}
				}
			} catch (err) {
				console.error('[api/v1] paid-order stream backfill failed', err);
				await push(sseComment('backfill-error'));
			}
		}
		holdingLiveEvents = false;
		void drain();
	})();

	heartbeat = setInterval(() => {
		void push(sseComment('heartbeat'));
	}, SSE_HEARTBEAT_MS);

	/**
	 * Each stream runs its own clock from its own opening, so reconnections spread out by themselves
	 * instead of arriving as one wave. Closing is not a loss for the client: it reconnects on its own
	 * and resumes at the last event it acknowledged.
	 */
	if (options.lifetimeSeconds !== undefined && options.lifetimeSeconds > 0) {
		expiry = setTimeout(cleanup, options.lifetimeSeconds * 1_000);
	}

	if (options.signal?.aborted) {
		cleanup();
	} else {
		options.signal?.addEventListener('abort', cleanup);
	}

	return new Response(readable, {
		headers: {
			'Content-Type': 'text/event-stream; charset=utf-8',
			// no-transform stops a proxy buffering or gzipping the stream into silence.
			'Cache-Control': 'private, no-cache, no-store, no-transform',
			Connection: 'keep-alive',
			'X-Accel-Buffering': 'no'
		}
	});
}
