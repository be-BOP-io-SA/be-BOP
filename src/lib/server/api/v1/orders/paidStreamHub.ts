import { collections } from '$lib/server/database';
import type { Order } from '$lib/types/Order';
import { isChangeStreamPositionLost } from '$lib/server/utils/isChangeStreamPositionLost';
import type { ChangeStream, ChangeStreamDocument, ResumeToken } from 'mongodb';

/**
 * What a write did to an order.
 *
 * `order`: the order itself changed — created, paid, failed, cancelled, anything about what was
 * sold or paid. `annotation`: only a note, a label or the erasure of its personal data, which
 * leaves the sale as it was.
 */
export type OrderChangeKind = 'order' | 'annotation';

export type OrderChangeListener = (order: Order) => void;

const REOPEN_DELAY_MS = 1_000;

/** Top-level fields an annotation touches, and nothing else does. */
const ANNOTATION_FIELDS = new Set([
	'notes',
	'orderLabelIds',
	'annotatedAt',
	'dataAnonymized',
	'shippingAddress',
	'billingAddress',
	'customCheckoutFields'
]);

const paidListeners = new Set<OrderChangeListener>();
const allListeners = new Set<OrderChangeListener>();
const annotationListeners = new Set<OrderChangeListener>();
const gapHandlers = new Set<GapHandler>();

let changeStream: ChangeStream<Order, ChangeStreamDocument<Order>> | null = null;
let resumeToken: ResumeToken | null = null;
let reopenTimer: ReturnType<typeof setTimeout> | null = null;

function hasPaidPayment(order: Order): boolean {
	return order.payments.some((payment) => payment.status === 'paid');
}

/**
 * An update is an annotation when it dated the order as annotated and not as changed, or when every
 * field it wrote or removed belongs to an annotation. An insert, a replace, or any other update is
 * a change of the order.
 */
export function changeKind(changeEvent: ChangeStreamDocument<Order>): OrderChangeKind {
	if (changeEvent.operationType !== 'update') {
		return 'order';
	}
	const description = changeEvent.updateDescription;
	const fields = new Set(
		[
			...Object.keys(description?.updatedFields ?? {}),
			...(description?.removedFields ?? []),
			...(description?.truncatedArrays ?? []).map((array) => array.field)
		].map((path) => path.split('.')[0])
	);
	if (!fields.size) {
		return 'order';
	}
	// An erasure also removes fields of the sale (who bought, from which address) without changing it.
	if (fields.has('annotatedAt') && !fields.has('updatedAt')) {
		return 'annotation';
	}
	return [...fields].every((field) => ANNOTATION_FIELDS.has(field)) ? 'annotation' : 'order';
}

function fanOut(order: Order, kind: OrderChangeKind): void {
	const targets =
		kind === 'annotation'
			? [...annotationListeners]
			: [...allListeners, ...(hasPaidPayment(order) ? paidListeners : [])];
	// Snapshot: a listener may unsubscribe itself from inside its own callback.
	for (const listener of targets) {
		try {
			listener(order);
		} catch (err) {
			console.error('[api/v1] order stream listener threw', err);
		}
	}
}

function totalListeners(): number {
	return paidListeners.size + allListeners.size + annotationListeners.size;
}

function closeStream(): void {
	changeStream?.close().catch(() => undefined);
	changeStream = null;
}

/**
 * One watch over every order, shared by every connection, open as long as anyone listens.
 *
 * While someone listens it is never narrowed nor reopened as subscribers come and go: a watch that
 * closes and opens again misses whatever is written in between, and nothing would ever send it.
 * Each subscriber picks its own share of the events instead. It closes when the last listener
 * leaves. When the watch fails, it reopens from the last event it saw, or at the live edge once the
 * server no longer holds that position.
 */
function openStream(): void {
	if (changeStream || reopenTimer || !totalListeners()) {
		return;
	}
	changeStream = collections.orders.watch(
		[{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }],
		resumeToken
			? { fullDocument: 'updateLookup', resumeAfter: resumeToken }
			: { fullDocument: 'updateLookup' }
	);
	// The driver also moves the position on a watch that has seen nothing yet, so a cut before the
	// first event still has somewhere to resume from.
	changeStream.on('resumeTokenChanged', (token) => {
		resumeToken = token;
	});
	changeStream.on('change', (changeEvent) => {
		const doc = 'fullDocument' in changeEvent ? changeEvent.fullDocument : null;
		if (doc) {
			fanOut(doc as Order, changeKind(changeEvent));
		}
	});
	changeStream.on('error', (err) => {
		console.error('[api/v1] order change stream error', err);
		closeStream();
		// The server no longer holds that position: asking for it again would fail the same way.
		if (isChangeStreamPositionLost(err)) {
			resumeToken = null;
			// What was written since the lost position will never reach the listeners: they must
			// start again from the database.
			for (const onGap of [...gapHandlers]) {
				onGap();
			}
		}
		if (totalListeners() && !reopenTimer) {
			reopenTimer = setTimeout(() => {
				reopenTimer = null;
				openStream();
			}, REOPEN_DELAY_MS);
		}
	});
}

/**
 * Called when the watch had to restart without the position it stopped at: events written since
 * are not coming. The listener starts again from the database.
 */
export type GapHandler = () => void;

/** Orders with at least one paid payment, on every change of the order itself. */
export function subscribeToPaidOrders(
	listener: OrderChangeListener,
	onGap?: GapHandler
): () => void {
	return subscribe(paidListeners, listener, onGap);
}

/** Every order, whatever its payments are worth, on every change of the order itself. */
export function subscribeToAllOrders(
	listener: OrderChangeListener,
	onGap?: GapHandler
): () => void {
	return subscribe(allListeners, listener, onGap);
}

/** Every order, each time a note or a label is put on it or its personal data is erased. */
export function subscribeToOrderAnnotations(
	listener: OrderChangeListener,
	onGap?: GapHandler
): () => void {
	return subscribe(annotationListeners, listener, onGap);
}

function subscribe(
	into: Set<OrderChangeListener>,
	listener: OrderChangeListener,
	onGap?: GapHandler
): () => void {
	into.add(listener);
	if (onGap) {
		gapHandlers.add(onGap);
	}
	openStream();

	let released = false;
	return () => {
		if (released) {
			return;
		}
		released = true;
		into.delete(listener);
		if (onGap) {
			gapHandlers.delete(onGap);
		}
		if (!totalListeners()) {
			if (reopenTimer) {
				clearTimeout(reopenTimer);
				reopenTimer = null;
			}
			closeStream();
			// Nobody listens any more: the next subscriber starts at the live edge.
			resumeToken = null;
		}
	};
}

/** Test seam — drops every listener and the underlying cursor. */
export function resetPaidOrderStreamHub(): void {
	paidListeners.clear();
	allListeners.clear();
	annotationListeners.clear();
	gapHandlers.clear();
	if (reopenTimer) {
		clearTimeout(reopenTimer);
		reopenTimer = null;
	}
	closeStream();
	resumeToken = null;
}
