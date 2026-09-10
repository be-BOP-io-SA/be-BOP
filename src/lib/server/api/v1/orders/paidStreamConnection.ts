import { apiError } from '../errors';
import type { Order } from '$lib/types/Order';
import { subscribeToPaidOrders } from './paidStreamHub';
import {
	SSE_HEARTBEAT_MS,
	SSE_RETRY_MS,
	iteratePaidOrderBacklog,
	orderStreamCursor,
	sseComment,
	sseEvent,
	type PaidStreamCursor
} from './paidStream';

/** Per API key, across every stream surface. Headroom so a reconnect can overlap the old one. */
const MAX_CONCURRENT_STREAMS_PER_KEY = 4;
/** Live events waiting to be written out. Past this the client is too slow to keep up. */
const MAX_PENDING_EVENTS = 1_000;
/** Fingerprints retained for dedupe. Bounded so a stream open for weeks cannot grow unbounded. */
const MAX_SEEN_FINGERPRINTS = 5_000;

const activeStreamsByKey = new Map<string, number>();

/** What one paid order looks like on the wire, for the surface asking. */
export type PaidStreamFraming = {
	/** The SSE `id:` line. */
	id: string;
	/** The SSE `data:` line, JSON-serialized. */
	data: unknown;
	/** Dedupe key — equal payloads for the same order must produce equal fingerprints. */
	fingerprint: string;
};

export type PaidStreamOptions = {
	/** API key id, for the per-credential connection budget. */
	keyId: string;
	signal?: AbortSignal;
	/** Replay from this instant, inclusive. Null means "start at the live edge". */
	since: Date | null;
	/** Replay strictly after this position. Null means none. */
	after: PaidStreamCursor | null;
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

	const openStreams = activeStreamsByKey.get(keyId) ?? 0;
	if (openStreams >= MAX_CONCURRENT_STREAMS_PER_KEY) {
		return apiError(
			429,
			'RATE_LIMITED',
			`At most ${MAX_CONCURRENT_STREAMS_PER_KEY} concurrent streams per API key`,
			undefined,
			{ 'Retry-After': '5' }
		);
	}
	activeStreamsByKey.set(keyId, openStreams + 1);

	// A Response body is a byte stream; encoding here keeps frame boundaries where SSE puts them.
	const encoder = new TextEncoder();
	const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
	let writer: WritableStreamDefaultWriter<Uint8Array> | null = writable.getWriter();
	let unsubscribe: (() => void) | null = null;
	let heartbeat: ReturnType<typeof setInterval> | null = null;
	let closed = false;

	const pending: Order[] = [];
	const seen = new Map<string, true>();
	const replaying = options.since !== null || options.after !== null;
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
		writer?.close().catch(() => undefined);
		writer = null;
		const remaining = (activeStreamsByKey.get(keyId) ?? 1) - 1;
		if (remaining > 0) {
			activeStreamsByKey.set(keyId, remaining);
		} else {
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
		if (seen.has(framing.fingerprint)) {
			return true;
		}
		remember(framing.fingerprint);
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
				if (order && !(await emit(order, orderStreamCursor(order)))) {
					return;
				}
			}
		} finally {
			draining = false;
		}
	}

	// Subscribed before the backfill, so an order paid mid-read cannot fall between snapshot and
	// live edge.
	unsubscribe = subscribeToPaidOrders((order) => {
		if (closed) {
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
					since: options.since,
					after: options.after
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
