import { collections } from '$lib/server/database';
import {
	ORDER_PAYMENT_STATUSES,
	orderIndividualItemPrice,
	type Order,
	type OrderPaymentStatus
} from '$lib/types/Order';
import type { Currency } from '$lib/types/Currency';
import { toCurrency } from '$lib/utils/toCurrency';
import { typedInclude } from '$lib/utils/typedIncludes';
import type { ObjectId } from 'mongodb';
import { amountToMinor } from './money';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export type PaidOrdersQuery = {
	since?: string;
	until?: string;
	limit?: string;
	cursor?: string;
	/** Orders containing this product id on at least one line. */
	productId?: string;
	/** Order-level status (`pending`, `paid`, `expired`, `canceled`, `failed`). */
	status?: string;
	/** Exact order number. */
	number?: string;
	/** Orders carrying this order label id. */
	label?: string;
	/** Caller's own `externalOrderId`. Always scoped to `apiKeyId` — never cross-key. */
	externalOrderId?: string;
	/** `_id` of the API key making the call. Required to use `externalOrderId`. */
	apiKeyId?: ObjectId;
};

/** A query parameter the caller got wrong. Routes map this to 400 VALIDATION_ERROR. */
export type OrderQueryError = { field: string; message: string };

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
	/** What was received, VAT included. */
	amountPaid: { amountMinor: number; currency: string };
	/** The VAT contained in `amountPaid`, one entry per rate. Absent when the order carries none. */
	vat?: Array<{ rate: number; amountMinor: number }>;
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

/** Strict positive-integer parse: rejects `+1`, `12abc`, `1.5` and anything out of safe range. */
function parsePositiveInt(raw: string): number | null {
	const trimmed = raw.trim();
	const n = Number.parseInt(trimmed, 10);
	if (!Number.isSafeInteger(n) || n < 1 || String(n) !== trimmed) {
		return null;
	}
	return n;
}

/**
 * Build the Mongo filter shared by both order listings.
 *
 * Every criterion here is backed by an existing index on `orders` (see database.ts):
 * `createdAt`, `{ 'items.product._id', status }`, `{ status, 'payments.status' }`,
 * `number` (unique), `orderLabelIds` (sparse), `{ externalSourceApiKeyId, externalOrderId }`.
 *
 * Unlike `limit` and the date bounds — which fall back silently for backwards compatibility —
 * a malformed filter is rejected. Dropping a filter silently widens the result set, and on an
 * order listing that means handing back rows the caller never asked for.
 */
function buildOrderFilter(
	query: PaidOrdersQuery
): { filter: Record<string, unknown> } | { error: OrderQueryError } {
	const filter: Record<string, unknown> = {};

	const createdAt: Record<string, Date> = {};
	const since = parseIsoDate(query.since);
	const until = parseIsoDate(query.until);
	if (since) {
		createdAt.$gte = since;
	}
	if (until) {
		createdAt.$lte = until;
	}
	if (Object.keys(createdAt).length) {
		filter.createdAt = createdAt;
	}

	// `number` carries both the exact-match filter and the pagination cursor, because both listings
	// are ordered by `number` descending. `_id` is a random UUID: sorting or paging on it yields an
	// arbitrary order, not the newest-first the callers rely on.
	const number: Record<string, number> = {};

	if (query.cursor) {
		const c = parsePositiveInt(query.cursor);
		if (c === null) {
			return { error: { field: 'cursor', message: 'cursor must be a positive integer' } };
		}
		number.$lt = c;
	}

	if (query.number !== undefined) {
		const n = parsePositiveInt(query.number);
		if (n === null) {
			return { error: { field: 'number', message: 'number must be a positive integer' } };
		}
		number.$eq = n;
	}

	if (Object.keys(number).length) {
		filter.number = number;
	}

	if (query.productId) {
		filter['items.product._id'] = query.productId;
	}

	if (query.status) {
		if (!typedInclude(ORDER_PAYMENT_STATUSES, query.status)) {
			return {
				error: {
					field: 'status',
					message: `status must be one of: ${ORDER_PAYMENT_STATUSES.join(', ')}`
				}
			};
		}
		filter.status = query.status satisfies OrderPaymentStatus;
	}

	if (query.label) {
		filter.orderLabelIds = query.label;
	}

	if (query.externalOrderId) {
		// Without the key scope this would expose another integrator's order under a guessed
		// reference — the uniqueness of externalOrderId is per API key, not global.
		if (!query.apiKeyId) {
			return {
				error: {
					field: 'externalOrderId',
					message: 'externalOrderId lookup requires an authenticated API key'
				}
			};
		}
		filter.externalSourceApiKeyId = query.apiKeyId;
		filter.externalOrderId = query.externalOrderId;
	}

	return { filter };
}

/**
 * What was actually received on the order, in major units — the shape be-BOP stores and the PoS
 * seam puts on the wire. `/api/v1` converts to minor at its DTO boundary.
 */
export function paidAmount(order: Order): { amount: number; currency: Currency } | null {
	// A payment predating the per-currency snapshots (#2492) carries none. Those rows are common in
	// any shop with history, and one of them must not take down a whole listing — so a payment
	// without a main snapshot contributes nothing rather than throwing.
	const paid = order.payments.filter((p) => p.status === 'paid' && p.currencySnapshot?.main?.price);
	if (!paid.length) {
		return null;
	}
	const currency = order.currencySnapshot?.main?.totalPrice?.currency as Currency | undefined;
	if (!currency) {
		return null;
	}
	const amount = paid.reduce((sum, p) => {
		const snap = p.currencySnapshot.main.price;
		if (snap.currency === currency) {
			return sum + snap.amount;
		}
		// A payment snapshot may be in another currency than the order total; converting is the
		// whole point of labelling amountPaid with the order currency.
		return sum + toCurrency(currency as Currency, snap.amount, snap.currency as Currency);
	}, 0);
	return { amount, currency };
}

/**
 * The VAT contained in what was received, one entry per rate, in major units.
 *
 * Read from the snapshot taken at payment time rather than recomputed: a rate that changed since is
 * not the rate that was charged. `order.vat` carries the rates and `currencySnapshot.main.vat` the
 * amounts, index-aligned — a rate whose amount is missing is dropped rather than reported at zero.
 */
export function orderVatBreakdown(order: Order): Array<{ rate: number; amount: number }> {
	const rates = order.vat ?? [];
	const amounts = order.currencySnapshot?.main?.vat ?? [];
	const rows: Array<{ rate: number; amount: number }> = [];
	rates.forEach((entry, index) => {
		const amount = amounts[index]?.amount;
		if (amount !== undefined) {
			rows.push({ rate: entry.rate, amount });
		}
	});
	return rows;
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
	const paid = paidAmount(order);
	if (!paid) {
		return null;
	}
	const amountPaid = {
		amountMinor: amountToMinor(paid.amount, paid.currency),
		currency: paid.currency
	};
	const lastPaid = [...order.payments].reverse().find((p) => p.status === 'paid' && p.paidAt);
	const vat = orderVatBreakdown(order).map((row) => ({
		rate: row.rate,
		amountMinor: amountToMinor(row.amount, amountPaid.currency)
	}));
	return {
		orderId: order._id,
		number: order.number,
		createdAt: order.createdAt.toISOString(),
		paidAt: lastPaid?.paidAt ? lastPaid.paidAt.toISOString() : order.updatedAt.toISOString(),
		amountPaid,
		...(vat.length && { vat }),
		items: order.items.map(toItemDto)
	};
}

/**
 * Paid orders for Face A pollers (armband / #2689). Unpaid rows are never returned.
 */
export async function listPaidOrders(query: PaidOrdersQuery): Promise<
	| {
			orders: PaidOrderDto[];
			page: { limit: number; nextCursor: string | null };
	  }
	| { error: OrderQueryError }
> {
	const limit = parseLimit(query.limit);

	const built = buildOrderFilter(query);
	if ('error' in built) {
		return built;
	}
	const filter: Record<string, unknown> = { ...built.filter, 'payments.status': 'paid' };

	const docs = await collections.orders
		.find(filter)
		.sort({ number: -1 })
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
	const nextCursor = hasMore ? String(pageDocs[pageDocs.length - 1].number) : null;
	return { orders, page: { limit, nextCursor } };
}

export type OrderReadDto = PaidOrderDto & { status: string };

/** Full orders:read DTO — includes unpaid rows; amountPaid may be zero. */
export function toOrderReadDto(order: Order): OrderReadDto {
	const currency = order.currencySnapshot.main.totalPrice.currency;
	const paid = paidAmount(order);
	const amountPaid = paid
		? { amountMinor: amountToMinor(paid.amount, paid.currency), currency: paid.currency }
		: { amountMinor: 0, currency };
	const lastPaid = [...order.payments].reverse().find((p) => p.status === 'paid' && p.paidAt);
	const vat = orderVatBreakdown(order).map((row) => ({
		rate: row.rate,
		amountMinor: amountToMinor(row.amount, amountPaid.currency)
	}));
	return {
		orderId: order._id,
		number: order.number,
		status: order.status,
		createdAt: order.createdAt.toISOString(),
		paidAt: lastPaid?.paidAt ? lastPaid.paidAt.toISOString() : null,
		amountPaid,
		...(vat.length && { vat }),
		items: order.items.map(toItemDto)
	};
}

/** All orders for Face A (`orders:read`), including unpaid. */
export async function listOrders(query: PaidOrdersQuery): Promise<
	| {
			orders: OrderReadDto[];
			page: { limit: number; nextCursor: string | null };
	  }
	| { error: OrderQueryError }
> {
	const limit = parseLimit(query.limit);

	const built = buildOrderFilter(query);
	if ('error' in built) {
		return built;
	}
	const filter = built.filter;

	const docs = await collections.orders
		.find(filter)
		.sort({ number: -1 })
		.limit(limit + 1)
		.toArray();

	const hasMore = docs.length > limit;
	const pageDocs = hasMore ? docs.slice(0, limit) : docs;
	const orders = pageDocs.map((doc) => toOrderReadDto(doc as Order));
	const nextCursor = hasMore ? String(pageDocs[pageDocs.length - 1].number) : null;
	return { orders, page: { limit, nextCursor } };
}
