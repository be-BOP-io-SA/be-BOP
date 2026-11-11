import { collections } from '$lib/server/database';
import type { Order } from '$lib/types/Order';
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

let changeStream: ChangeStream<Order, ChangeStreamDocument<Order>> | null = null;
let resumeToken: ResumeToken | null = null;
let reopenTimer: ReturnType<typeof setTimeout> | null = null;

function hasPaidPayment(order: Order): boolean {
	return order.payments.some((payment) => payment.status === 'paid');
}

/**
 * An update is an annotation when every field it wrote or removed belongs to one. An insert, a
 * replace, or an update that touched anything else is a change of the order.
 */
export function changeKind(changeEvent: ChangeStreamDocument<Order>): OrderChangeKind {
	if (changeEvent.operationType !== 'update') {
		return 'order';
	}
	const description = changeEvent.updateDescription;
	const paths = [
		...Object.keys(description?.updatedFields ?? {}),
		...(description?.removedFields ?? []),
		...(description?.truncatedArrays ?? []).map((array) => array.field)
	];
	if (!paths.length) {
		return 'order';
	}
	return paths.every((path) => ANNOTATION_FIELDS.has(path.split('.')[0])) ? 'annotation' : 'order';
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
 * It is never narrowed nor reopened as subscribers come and go: a watch that closes and opens again
 * misses whatever is written in between, and nothing would ever send it. Each subscriber picks its
 * own share of the events instead. When the watch fails, it reopens where it stopped, from the last
 * event it saw.
 */
function openStream(): void {
	if (changeStream || reopenTimer || !totalListeners()) {
		return;
	}
	changeStream = collections.orders.watch(
		[{ $match: { operationType: { $in: ['insert', 'update', 'replace'] } } }],
		{ fullDocument: 'updateLookup', ...(resumeToken && { resumeAfter: resumeToken }) }
	);
	changeStream.on('change', (changeEvent) => {
		resumeToken = changeEvent._id;
		const doc = 'fullDocument' in changeEvent ? changeEvent.fullDocument : null;
		if (doc) {
			fanOut(doc as Order, changeKind(changeEvent));
		}
	});
	changeStream.on('error', (err) => {
		console.error('[api/v1] order change stream error', err);
		closeStream();
		if (totalListeners() && !reopenTimer) {
			reopenTimer = setTimeout(() => {
				reopenTimer = null;
				openStream();
			}, REOPEN_DELAY_MS);
		}
	});
}

/** Orders with at least one paid payment, on every change of the order itself. */
export function subscribeToPaidOrders(listener: OrderChangeListener): () => void {
	return subscribe(paidListeners, listener);
}

/** Every order, whatever its payments are worth, on every change of the order itself. */
export function subscribeToAllOrders(listener: OrderChangeListener): () => void {
	return subscribe(allListeners, listener);
}

/** Every order, each time a note or a label is put on it or its personal data is erased. */
export function subscribeToOrderAnnotations(listener: OrderChangeListener): () => void {
	return subscribe(annotationListeners, listener);
}

function subscribe(into: Set<OrderChangeListener>, listener: OrderChangeListener): () => void {
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
	if (reopenTimer) {
		clearTimeout(reopenTimer);
		reopenTimer = null;
	}
	closeStream();
	resumeToken = null;
}
