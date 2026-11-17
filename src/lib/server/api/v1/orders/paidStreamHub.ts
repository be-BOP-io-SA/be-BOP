import { collections } from '$lib/server/database';
import type { Order } from '$lib/types/Order';
import type { ChangeStream, ChangeStreamDocument } from 'mongodb';

export type PaidOrderListener = (order: Order) => void;

const REOPEN_DELAY_MS = 1_000;

const listeners = new Set<PaidOrderListener>();
/**
 * Listeners that want every order, not just the paid ones.
 *
 * Kept apart so the change stream can stay narrow while nobody asks for the wide feed: the moment
 * one subscriber wants unpaid orders too, the filter has to open for everyone, and every listener
 * that only cares about paid ones filters again on its side.
 */
const anyStatusListeners = new Set<PaidOrderListener>();
let changeStream: ChangeStream<Order, ChangeStreamDocument<Order>> | null = null;
let watchingAnyStatus = false;
let reopenTimer: ReturnType<typeof setTimeout> | null = null;

function hasPaidPayment(order: Order): boolean {
	return order.payments.some((payment) => payment.status === 'paid');
}

function fanOut(order: Order): void {
	const paid = hasPaidPayment(order);
	// Snapshot: a listener may unsubscribe itself from inside its own callback.
	for (const listener of [...anyStatusListeners, ...(paid ? listeners : [])]) {
		try {
			listener(order);
		} catch (err) {
			console.error('[api/v1] order stream listener threw', err);
		}
	}
}

function closeStream(): void {
	changeStream?.close().catch(() => undefined);
	changeStream = null;
}

function totalListeners(): number {
	return listeners.size + anyStatusListeners.size;
}

function openStream(): void {
	const wantAnyStatus = anyStatusListeners.size > 0;
	// A narrow cursor cannot serve a subscriber that wants everything: reopen it wide.
	if (changeStream && watchingAnyStatus === wantAnyStatus) {
		return;
	}
	if (!totalListeners()) {
		return;
	}
	closeStream();
	watchingAnyStatus = wantAnyStatus;
	changeStream = collections.orders.watch(
		[
			{
				$match: {
					operationType: { $in: ['insert', 'update', 'replace'] },
					...(wantAnyStatus ? {} : { 'fullDocument.payments.status': 'paid' })
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
		console.error('[api/v1] order change stream error', err);
		closeStream();
		if (totalListeners() && !reopenTimer) {
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
	return subscribe(listeners, listener);
}

/**
 * Subscribe to every order, whatever its payments are worth.
 *
 * The wide feed: an order created pending, one that failed, one that was cancelled. Announced on
 * each write, so the same order comes back as it moves.
 */
export function subscribeToAllOrders(listener: PaidOrderListener): () => void {
	return subscribe(anyStatusListeners, listener);
}

function subscribe(into: Set<PaidOrderListener>, listener: PaidOrderListener): () => void {
	into.add(listener);
	openStream();

	let released = false;
	return () => {
		if (released) {
			return;
		}
		released = true;
		into.delete(listener);
		if (!totalListeners()) {
			if (reopenTimer) {
				clearTimeout(reopenTimer);
				reopenTimer = null;
			}
			closeStream();
			return;
		}
		// The last wide subscriber left: narrow the cursor again rather than keep reading everything.
		if (!anyStatusListeners.size && watchingAnyStatus) {
			openStream();
		}
	};
}

/** Test seam — drops every listener and the underlying cursor. */
export function resetPaidOrderStreamHub(): void {
	listeners.clear();
	anyStatusListeners.clear();
	watchingAnyStatus = false;
	if (reopenTimer) {
		clearTimeout(reopenTimer);
		reopenTimer = null;
	}
	closeStream();
}
