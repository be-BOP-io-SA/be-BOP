import { collections } from '$lib/server/database';
import type { Order } from '$lib/types/Order';
import type { ChangeStream, ChangeStreamDocument } from 'mongodb';

export type PaidOrderListener = (order: Order) => void;

const REOPEN_DELAY_MS = 1_000;

const listeners = new Set<PaidOrderListener>();
let changeStream: ChangeStream<Order, ChangeStreamDocument<Order>> | null = null;
let reopenTimer: ReturnType<typeof setTimeout> | null = null;

function fanOut(order: Order): void {
	// Snapshot: a listener may unsubscribe itself from inside its own callback.
	for (const listener of [...listeners]) {
		try {
			listener(order);
		} catch (err) {
			console.error('[api/v1] paid-order stream listener threw', err);
		}
	}
}

function closeStream(): void {
	changeStream?.close().catch(() => undefined);
	changeStream = null;
}

function openStream(): void {
	if (changeStream || !listeners.size) {
		return;
	}
	changeStream = collections.orders.watch(
		[
			{
				$match: {
					operationType: { $in: ['insert', 'update', 'replace'] },
					'fullDocument.payments.status': 'paid'
				}
			}
		],
		{ fullDocument: 'updateLookup' }
	);
	changeStream.on('change', (changeEvent) => {
		const doc = 'fullDocument' in changeEvent ? changeEvent.fullDocument : null;
		if (doc) {
			fanOut(doc as Order);
		}
	});
	changeStream.on('error', (err) => {
		console.error('[api/v1] paid-order change stream error', err);
		closeStream();
		if (listeners.size && !reopenTimer) {
			// Subscribers stay connected across the gap; events missed in between are recovered on
			// the next reconnect through Last-Event-ID.
			reopenTimer = setTimeout(() => {
				reopenTimer = null;
				openStream();
			}, REOPEN_DELAY_MS);
		}
	});
}

/**
 * Subscribe to orders that have at least one paid payment.
 *
 * One change stream — a server-side cursor — is shared by every connection. Returns the unsubscribe
 * function; the stream closes with the last listener.
 */
export function subscribeToPaidOrders(listener: PaidOrderListener): () => void {
	listeners.add(listener);
	openStream();

	let released = false;
	return () => {
		if (released) {
			return;
		}
		released = true;
		listeners.delete(listener);
		if (!listeners.size) {
			if (reopenTimer) {
				clearTimeout(reopenTimer);
				reopenTimer = null;
			}
			closeStream();
		}
	};
}

/** Test seam — drops every listener and the underlying cursor. */
export function resetPaidOrderStreamHub(): void {
	listeners.clear();
	if (reopenTimer) {
		clearTimeout(reopenTimer);
		reopenTimer = null;
	}
	closeStream();
}
