import { collections } from '$lib/server/database';
import type { Order } from '$lib/types/Order';
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
	unitPrice: { amountMinor: number; currency: string };
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
		return sum + snap.amount;
	}, 0);
	return { amountMinor: amountToMinor(amount, currency), currency };
}

function toItemDto(item: Order['items'][number]): PaidOrderItemDto {
	const currency = item.currencySnapshot.main.price.currency;
	const unit = item.currencySnapshot.main.customPrice ?? item.currencySnapshot.main.price;
	return {
		productId: item.product._id,
		name: item.product.name,
		quantity: item.quantity,
		...(item.uniqueKey && { uniqueKey: item.uniqueKey }),
		...(item.chosenVariations && { chosenVariations: item.chosenVariations }),
		unitPrice: {
			amountMinor: amountToMinor(unit.amount, unit.currency ?? currency),
			currency: unit.currency ?? currency
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

	const mapped: PaidOrderDto[] = [];
	for (const doc of docs) {
		const dto = toPaidOrderDto(doc as Order);
		if (dto) {
			mapped.push(dto);
		}
	}
	const hasMore = mapped.length > limit;
	const pageDocs = hasMore ? mapped.slice(0, limit) : mapped;
	const nextCursor = hasMore ? pageDocs[pageDocs.length - 1].orderId : null;
	return { orders: pageDocs, page: { limit, nextCursor } };
}
