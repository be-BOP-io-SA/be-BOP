import type { Order } from '$lib/types/Order';
import type { ObjectId } from 'mongodb';
import type { PosPaidOrderEvent } from '$lib/types/ApiV1Pos';
import { orderVatBreakdown, paidAmount } from '../orders/listPaid';
import { amountToMinor } from '../orders/money';
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
/**
 * What an integration needs to recognise an order: the reference whoever placed it gave, and
 * the checkout fields collected on it. Without them a consumer crediting on payment cannot tell
 * its own orders apart and credits them twice.
 */
function orderContext(order: Order) {
	const customFields = (order.customCheckoutFields ?? []).map((field) => ({
		slug: field.slug,
		label: field.label,
		...(field.value !== undefined && { value: field.value })
	}));
	return {
		...(order.externalOrderId && { externalOrderId: order.externalOrderId }),
		...(customFields.length && { customFields })
	};
}

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
			amount: { amountMinor: amountToMinor(line.amount, line.currency), currency: line.currency },
			...(line.chosenVariations && { chosenVariations: line.chosenVariations }),
			...(line.vat && {
				vat: [{ rate: line.vat.rate, amountMinor: amountToMinor(line.vat.amount, line.currency) }]
			}),
			...orderContext(order)
		};
	}

	const vat = orderVatBreakdown(order).map((row) => ({
		rate: row.rate,
		amountMinor: amountToMinor(row.amount, paid.currency)
	}));
	return {
		orderId: order._id,
		amount: { amountMinor: amountToMinor(paid.amount, paid.currency), currency: paid.currency },
		...(vat.length && { vat }),
		...orderContext(order)
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
	/** Only the orders written with this API key, for a key restricted to its own orders. */
	ordersOfKey?: ObjectId;
}): Promise<{ orders: PosPaidOrderEvent[]; nextCursor: string | null }> {
	const orders: PosPaidOrderEvent[] = [];
	let lastId: string | null = null;
	let reachedTail = true;

	for await (const frame of iteratePaidOrderBacklog({
		since: opts.since,
		after: opts.after,
		...(opts.ordersOfKey && { ordersOfKey: opts.ordersOfKey })
	})) {
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
