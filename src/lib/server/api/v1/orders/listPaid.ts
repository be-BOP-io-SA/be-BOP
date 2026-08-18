import { collections } from '$lib/server/database';
import { orderIndividualItemPrice, type Order } from '$lib/types/Order';
import type { Currency } from '$lib/types/Currency';
import { toCurrency } from '$lib/utils/toCurrency';
import { amountToMinor } from './money';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export type PaidOrdersQuery = {
	since?: string;
	until?: string;
	limit?: string;
	cursor?: string;
};

export type PaidOrderItemDto = {
	productId: string;
	name: string;
	quantity: number;
	uniqueKey?: string;
	chosenVariations?: Record<string, string>;
	/** Per-unit price after any line discount. Units actually charged = quantity - freeQuantity. */
	unitPrice: { amountMinor: number; currency: string };
	/** Units given away on the line (POS offer). Omitted when zero. */
	freeQuantity?: number;
};

export type PaidOrderDto = {
	orderId: string;
	number: number;
	createdAt: string;
	paidAt: string | null;
	amountPaid: { amountMinor: number; currency: string };
	items: PaidOrderItemDto[];
};

function parseLimit(raw: string | undefined): number {
	const n = raw ? Number.parseInt(raw, 10) : DEFAULT_LIMIT;
	if (!Number.isFinite(n) || n < 1) {
		return DEFAULT_LIMIT;
	}
	return Math.min(n, MAX_LIMIT);
}

function parseIsoDate(raw: string | undefined): Date | undefined {
	if (!raw) {
		return undefined;
	}
	const d = new Date(raw);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

function paidAmount(order: Order): { amountMinor: number; currency: string } | null {
	const paid = order.payments.filter((p) => p.status === 'paid');
	if (!paid.length) {
		return null;
	}
	const currency = order.currencySnapshot.main.totalPrice.currency;
	const amount = paid.reduce((sum, p) => {
		const snap = p.currencySnapshot.main.price;
		if (snap.currency === currency) {
			return sum + snap.amount;
		}
		// A payment snapshot may be in another currency than the order total; converting is the
		// whole point of labelling amountPaid with the order currency.
		return sum + toCurrency(currency as Currency, snap.amount, snap.currency as Currency);
	}, 0);
	return { amountMinor: amountToMinor(amount, currency), currency };
}

function toItemDto(item: Order['items'][number]): PaidOrderItemDto {
	const currency = item.currencySnapshot.main.price.currency;
	// Raw snapshot prices ignore discountPercentage / freeQuantity, so sum(items) drifted above
	// amountPaid on any discounted line. Report what was actually charged instead.
	const unitAmount = orderIndividualItemPrice(item, 'main');
	const freeQuantity = item.freeQuantity ?? 0;
	return {
		productId: item.product._id,
		name: item.product.name,
		quantity: item.quantity,
		...(item.uniqueKey && { uniqueKey: item.uniqueKey }),
		...(item.chosenVariations && { chosenVariations: item.chosenVariations }),
		...(freeQuantity > 0 && { freeQuantity }),
		unitPrice: {
			amountMinor: amountToMinor(unitAmount, currency),
			currency
		}
	};
}

export function toPaidOrderDto(order: Order): PaidOrderDto | null {
	const amountPaid = paidAmount(order);
	if (!amountPaid) {
		return null;
	}
	const lastPaid = [...order.payments].reverse().find((p) => p.status === 'paid' && p.paidAt);
	return {
		orderId: order._id,
		number: order.number,
		createdAt: order.createdAt.toISOString(),
		paidAt: lastPaid?.paidAt ? lastPaid.paidAt.toISOString() : order.updatedAt.toISOString(),
		amountPaid,
		items: order.items.map(toItemDto)
	};
}

/**
 * Paid orders for Face A pollers (armband / #2689). Unpaid rows are never returned.
 */
export async function listPaidOrders(query: PaidOrdersQuery): Promise<{
	orders: PaidOrderDto[];
	page: { limit: number; nextCursor: string | null };
}> {
	const limit = parseLimit(query.limit);
	const since = parseIsoDate(query.since);
	const until = parseIsoDate(query.until);

	const filter: Record<string, unknown> = {
		'payments.status': 'paid'
	};
	const createdAt: Record<string, Date> = {};
	if (since) {
		createdAt.$gte = since;
	}
	if (until) {
		createdAt.$lte = until;
	}
	if (Object.keys(createdAt).length) {
		filter.createdAt = createdAt;
	}
	if (query.cursor) {
		filter._id = { $lt: query.cursor };
	}

	const docs = await collections.orders
		.find(filter)
		.sort({ _id: -1 })
		.limit(limit + 1)
		.toArray();

	// Page on `docs` (the +1 over-fetch), never on the mapped array: toPaidOrderDto drops rows,
	// and a single drop on a full page would zero out nextCursor and strand the poller.
	const hasMore = docs.length > limit;
	const pageDocs = hasMore ? docs.slice(0, limit) : docs;
	const orders: PaidOrderDto[] = [];
	for (const doc of pageDocs) {
		const dto = toPaidOrderDto(doc as Order);
		if (dto) {
			orders.push(dto);
		}
	}
	// Cursor follows the last row actually read, so a dropped row is skipped, not replayed.
	const nextCursor = hasMore ? String(pageDocs[pageDocs.length - 1]._id) : null;
	return { orders, page: { limit, nextCursor } };
}

export type OrderReadDto = PaidOrderDto & { status: string };

/** Full orders:read DTO — includes unpaid rows; amountPaid may be zero. */
export function toOrderReadDto(order: Order): OrderReadDto {
	const currency = order.currencySnapshot.main.totalPrice.currency;
	const amountPaid = paidAmount(order) ?? { amountMinor: 0, currency };
	const lastPaid = [...order.payments].reverse().find((p) => p.status === 'paid' && p.paidAt);
	return {
		orderId: order._id,
		number: order.number,
		status: order.status,
		createdAt: order.createdAt.toISOString(),
		paidAt: lastPaid?.paidAt ? lastPaid.paidAt.toISOString() : null,
		amountPaid,
		items: order.items.map(toItemDto)
	};
}

/** All orders for Face A (`orders:read`), including unpaid. */
export async function listOrders(query: PaidOrdersQuery): Promise<{
	orders: OrderReadDto[];
	page: { limit: number; nextCursor: string | null };
}> {
	const limit = parseLimit(query.limit);
	const since = parseIsoDate(query.since);
	const until = parseIsoDate(query.until);

	const filter: Record<string, unknown> = {};
	const createdAt: Record<string, Date> = {};
	if (since) {
		createdAt.$gte = since;
	}
	if (until) {
		createdAt.$lte = until;
	}
	if (Object.keys(createdAt).length) {
		filter.createdAt = createdAt;
	}
	if (query.cursor) {
		filter._id = { $lt: query.cursor };
	}

	const docs = await collections.orders
		.find(filter)
		.sort({ _id: -1 })
		.limit(limit + 1)
		.toArray();

	const hasMore = docs.length > limit;
	const pageDocs = hasMore ? docs.slice(0, limit) : docs;
	const orders = pageDocs.map((doc) => toOrderReadDto(doc as Order));
	const nextCursor = hasMore ? String(pageDocs[pageDocs.length - 1]._id) : null;
	return { orders, page: { limit, nextCursor } };
}
