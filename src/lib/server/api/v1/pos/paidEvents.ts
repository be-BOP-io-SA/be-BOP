import type { Order } from '$lib/types/Order';
import type { PosPaidOrderEvent } from '$lib/types/ApiV1Pos';
import { orderVatBreakdown, paidAmount } from '../orders/listPaid';
import { findTaggedLine } from './taggedLine';
import { iteratePaidOrderBacklog, type PaidStreamCursor } from '../orders/paidStream';

/**
 * One paid order on the wire.
 *
 * Without `tag`, the whole order: `amount` is everything received. With one, only orders carrying a
 * line whose product bears that tag, and `amount` is that line alone — which is what an integration
 * crediting a single item needs, not the total of a basket it did not sell.
 *
 * Null in three cases, all of them meaning "nothing to announce": nothing was actually received; a
 * tag was named and no line carries it; or more than one does, which is refused rather than
 * resolved arbitrarily and logged so the shop can see it.
 */
export function toPosPaidOrderEvent(order: Order, tag?: string): PosPaidOrderEvent | null {
	const paid = paidAmount(order);
	if (!paid) {
		return null;
	}

	if (tag) {
		const line = findTaggedLine(order, tag);
		if (line === 'ambiguous') {
			console.error(
				`[api/v1] order ${order._id} carries more than one line tagged "${tag}"; not announced`
			);
			return null;
		}
		if (!line) {
			return null;
		}
		return {
			orderId: order._id,
			amount: { amount: line.amount, currency: line.currency },
			...(line.key && { key: line.key }),
			...(line.vat && { vat: [line.vat] })
		};
	}

	const vat = orderVatBreakdown(order);
	return {
		orderId: order._id,
		amount: { amount: paid.amount, currency: paid.currency },
		...(vat.length && { vat })
	};
}

/**
 * One page of paid orders, in the same vocabulary the stream uses.
 *
 * `nextCursor` is the last order id of the page, which the caller feeds back as `last_event_id` —
 * the same token the stream resumes on, so a client that falls back to polling relearns nothing.
 * Null when the page is the tail.
 */
export async function listPosPaidOrders(opts: {
	since: Date | null;
	after: PaidStreamCursor | null;
	limit: number;
	tag?: string;
}): Promise<{ orders: PosPaidOrderEvent[]; nextCursor: string | null }> {
	const orders: PosPaidOrderEvent[] = [];
	let lastId: string | null = null;
	let reachedTail = true;

	for await (const frame of iteratePaidOrderBacklog({ since: opts.since, after: opts.after })) {
		if (orders.length >= opts.limit) {
			reachedTail = false;
			break;
		}
		const event = toPosPaidOrderEvent(frame.order, opts.tag);
		if (event) {
			orders.push(event);
			lastId = event.orderId;
		}
	}

	return { orders, nextCursor: reachedTail ? null : lastId };
}
