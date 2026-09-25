import type { Filter } from 'mongodb';
import { endOfDay, startOfDay, subMonths } from 'date-fns';
import { z } from 'zod';
import { collections } from '$lib/server/database';
import { countryFromIp } from '$lib/server/geoip';
import type { PaymentMethod } from '$lib/server/payment-methods';
import type { Currency } from '$lib/types/Currency';
import { orderItemPrice, type Order, type OrderPayment, type Price } from '$lib/types/Order';
import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding';
import { sumCurrency } from '$lib/utils/sumCurrency';

export const REPORTING_PAGE_SIZE = 100;

const booleanParam = z
	.string()
	.optional()
	.transform((value) => value === 'on' || value === 'true');

export function parseReportingFilters(url: URL, methods: PaymentMethod[]) {
	const querySchema = z.object({
		beginsAt: z.string().optional(),
		endsAt: z.string().optional(),
		paymentMethod: z.enum(['' as const, ...methods]).optional(),
		employeesAlias: z.string().array(),
		tagId: z.string().optional(),
		posSubtype: z.string().optional(),
		includePending: booleanParam,
		includeExpired: booleanParam,
		includeCanceled: booleanParam,
		includePartiallyPaid: booleanParam
	});
	const parsed = querySchema.parse({
		...Object.fromEntries(url.searchParams.entries()),
		employeesAlias: url.searchParams.getAll('employeesAlias')
	});

	return {
		...parsed,
		beginsAt: parseDate(parsed.beginsAt) ?? startOfDay(subMonths(new Date(), 1)),
		endsAt: parseEndDate(parsed.endsAt) ?? endOfDay(new Date()),
		paymentMethod: parsed.paymentMethod || undefined,
		tagId: parsed.tagId || undefined,
		posSubtype: parsed.posSubtype || undefined
	};
}

export type ReportingFilters = ReturnType<typeof parseReportingFilters>;

function parseDate(value: string | undefined) {
	if (!value) {
		return undefined;
	}
	const date = new Date(value);
	return isNaN(date.getTime()) ? undefined : date;
}

// A minute-precision bound ("2026-09-01T18:30") must include the whole last minute.
function parseEndDate(value: string | undefined) {
	const date = parseDate(value);
	if (date && date.getSeconds() === 0 && date.getMilliseconds() === 0) {
		date.setSeconds(59, 999);
	}
	return date;
}

/**
 * Only the fields the reporting reads: the embedded product snapshot carries the full CMS
 * content and would otherwise dominate the payload.
 */
const REPORTING_PROJECTION = {
	number: 1,
	createdAt: 1,
	status: 1,
	clientIp: 1,
	billingAddress: 1,
	shippingAddress: 1,
	'currencySnapshot.main': 1,
	'items.product._id': 1,
	'items.product.name': 1,
	'items.product.tagIds': 1,
	'items.product.bookingSpec.slotMinutes': 1,
	'items.quantity': 1,
	'items.freeQuantity': 1,
	'items.discountPercentage': 1,
	'items.depositPercentage': 1,
	'items.vatRate': 1,
	'items.booking.start': 1,
	'items.booking.end': 1,
	'items.booking.bookedDates': 1,
	'items.currencySnapshot.main': 1,
	'payments._id': 1,
	'payments.status': 1,
	'payments.method': 1,
	'payments.posSubtype': 1,
	'payments.customPaymentMethod.label': 1,
	'payments.price': 1,
	'payments.currencySnapshot.main.price': 1,
	'payments.createdAt': 1,
	'payments.paidAt': 1,
	'payments.invoice': 1,
	'payments.invoiceId': 1,
	'payments.bankTransferNumber': 1,
	'payments.detail': 1,
	'payments.transactions.id': 1,
	'payments.transactions.transaction_code': 1
} as const;

type ReportingItem = Pick<
	Order['items'][number],
	| 'quantity'
	| 'freeQuantity'
	| 'discountPercentage'
	| 'depositPercentage'
	| 'vatRate'
	| 'booking'
	| 'currencySnapshot'
> & {
	product: Pick<Order['items'][number]['product'], '_id' | 'name' | 'tagIds' | 'bookingSpec'>;
};

type ReportingPayment = Pick<
	OrderPayment,
	| '_id'
	| 'status'
	| 'method'
	| 'posSubtype'
	| 'customPaymentMethod'
	| 'price'
	| 'currencySnapshot'
	| 'createdAt'
	| 'paidAt'
	| 'invoice'
	| 'invoiceId'
	| 'bankTransferNumber'
	| 'detail'
	| 'transactions'
>;

export type ReportingOrder = Pick<
	Order,
	| '_id'
	| 'number'
	| 'createdAt'
	| 'status'
	| 'clientIp'
	| 'billingAddress'
	| 'shippingAddress'
	| 'currencySnapshot'
> & {
	items: ReportingItem[];
	payments: ReportingPayment[];
};

export function reportingOrdersQuery(filters: ReportingFilters): Filter<Order> {
	const aliasFilter: Filter<Order>[] = [];
	if (filters.employeesAlias.includes('System')) {
		aliasFilter.push({ 'user.userAlias': { $exists: false } });
	}
	const otherAliases = filters.employeesAlias.filter((alias) => alias !== 'System');
	if (otherAliases.length > 0) {
		aliasFilter.push({ 'user.userAlias': { $in: otherAliases } });
	}

	return {
		createdAt: { $gte: filters.beginsAt, $lte: filters.endsAt },
		...statusQuery(filters),
		...paymentQuery(filters),
		...(aliasFilter.length > 0 && { $or: aliasFilter }),
		...(filters.tagId && { 'items.product.tagIds': filters.tagId })
	};
}

// Method and subtype must match on the same payment, not on two different ones of the order.
function paymentQuery(filters: ReportingFilters): Filter<Order> {
	if (!filters.paymentMethod && !filters.posSubtype) {
		return {};
	}
	return {
		payments: {
			$elemMatch: {
				...(filters.paymentMethod && { method: filters.paymentMethod }),
				...(filters.posSubtype && { posSubtype: filters.posSubtype })
			}
		}
	};
}

// The partially paid filter looks at payment statuses, so any order status can match.
function statusQuery(filters: ReportingFilters): Filter<Order> {
	if (filters.includePartiallyPaid) {
		return {};
	}
	return {
		status: {
			$in: [
				'paid',
				...(filters.includePending ? (['pending'] as const) : []),
				...(filters.includeExpired ? (['expired'] as const) : []),
				...(filters.includeCanceled ? (['canceled'] as const) : [])
			]
		}
	};
}

export async function fetchReportingOrders(filters: ReportingFilters): Promise<ReportingOrder[]> {
	return await collections.orders
		.find(reportingOrdersQuery(filters))
		.project<ReportingOrder>(REPORTING_PROJECTION)
		.sort({ createdAt: -1 })
		.toArray();
}

function paymentMatchesFilter(
	payment: Pick<ReportingPayment, 'method' | 'posSubtype'>,
	filters: ReportingFilters
) {
	if (!filters.paymentMethod) {
		return true;
	}
	if (payment.method !== filters.paymentMethod) {
		return false;
	}
	return !filters.posSubtype || payment.posSubtype === filters.posSubtype;
}

function itemMatchesTag(item: ReportingItem, tagId: string | undefined) {
	return !tagId || !!item.product.tagIds?.includes(tagId);
}

export function selectOrderDetail(orders: ReportingOrder[], filters: ReportingFilters) {
	return orders.filter(
		(order) =>
			order.status === 'paid' ||
			(filters.includePending && order.status === 'pending') ||
			(filters.includeExpired && order.status === 'expired') ||
			(filters.includeCanceled && order.status === 'canceled') ||
			(filters.includePartiallyPaid && order.payments.some((payment) => payment.status === 'paid'))
	);
}

export function selectProductDetail(orders: ReportingOrder[], filters: ReportingFilters) {
	return selectOrderDetail(orders, filters).flatMap((order) =>
		order.items
			.filter((item) => itemMatchesTag(item, filters.tagId))
			.map((item) => ({ order, item }))
	);
}

export function selectPaymentDetail(orders: ReportingOrder[], filters: ReportingFilters) {
	return selectOrderDetail(orders, filters).flatMap((order) =>
		order.payments
			.filter((payment) => paymentMatchesFilter(payment, filters))
			.map((payment) => ({ order, payment }))
	);
}

function orderIpCountry(order: ReportingOrder) {
	return countryFromIp(order.clientIp ?? '');
}

export function toOrderRow(order: ReportingOrder) {
	return {
		_id: order._id,
		number: order.number,
		createdAt: order.createdAt,
		status: order.status,
		totalPrice: order.currencySnapshot.main.totalPrice,
		billingAddress: order.billingAddress,
		shippingAddress: order.shippingAddress,
		ipCountry: orderIpCountry(order),
		productNames: order.items.map((item) => item.product.name)
	};
}

export function toProductRow({ order, item }: { order: ReportingOrder; item: ReportingItem }) {
	return {
		productId: item.product._id,
		productName: item.product.name,
		quantity: item.quantity,
		depositPercentage: item.depositPercentage,
		orderNumber: order.number,
		orderCreatedAt: order.createdAt,
		currency: item.currencySnapshot.main.price.currency,
		price: orderItemPrice(item, 'main'),
		vatRate: item.vatRate
	};
}

export function toPaymentRow({
	order,
	payment
}: {
	order: ReportingOrder;
	payment: ReportingPayment;
}) {
	return {
		id: payment._id.toString(),
		orderId: order._id,
		orderNumber: order.number,
		orderCreatedAt: order.createdAt,
		orderPaymentIds: order.payments.map((p) => p._id.toString()),
		orderStatus: order.status,
		method: payment.method,
		posSubtype: payment.posSubtype,
		status: payment.status,
		createdAt: payment.createdAt,
		paidAt: payment.paidAt,
		invoice: payment.invoice,
		info: paymentInfo(payment),
		mainPrice: payment.currencySnapshot.main.price,
		price: payment.price,
		country:
			order.billingAddress?.country ?? order.shippingAddress?.country ?? orderIpCountry(order)
	};
}

function paymentInfo(payment: ReportingPayment) {
	switch (payment.method) {
		case 'lightning':
			return payment.invoiceId;
		case 'bank-transfer':
			return payment.bankTransferNumber;
		case 'card':
			return payment.transactions?.[0]?.transaction_code;
		case 'bitcoin':
			return payment.transactions?.[0]?.id ?? '';
		default:
			return payment.detail || '';
	}
}

export function toReceiptRow({
	order,
	payment
}: {
	order: ReportingOrder;
	payment: ReportingPayment;
}) {
	return { orderId: order._id, paymentId: payment._id.toString() };
}

export function selectReceipts(orders: ReportingOrder[], filters: ReportingFilters) {
	return selectOrderDetail(orders, filters).flatMap((order) =>
		order.payments
			.filter((payment) => payment.status === 'paid')
			.map((payment) => toReceiptRow({ order, payment }))
	);
}

function paymentSynthesisKey(payment: ReportingPayment) {
	if (payment.method === 'point-of-sale' && payment.posSubtype) {
		return `${payment.method}:${payment.posSubtype}`;
	}
	if (payment.method === 'custom') {
		return `custom:${payment.customPaymentMethod?.label ?? ''}`;
	}
	return payment.method;
}

/** Totals over paid orders only; the "include …" toggles only affect the detail tables. */
export function computeReportingSynthesis(
	orders: ReportingOrder[],
	filters: ReportingFilters,
	mainCurrency: Currency
) {
	const paidOrders = orders.filter((order) => order.status === 'paid');
	const taggedItems = filters.tagId
		? paidOrders.flatMap((order) =>
				order.items.filter((item) => itemMatchesTag(item, filters.tagId))
		  )
		: [];

	const products = new Map<string, { name: string; quantity: number; prices: Price[] }>();
	for (const order of paidOrders) {
		for (const item of order.items) {
			if (!itemMatchesTag(item, filters.tagId)) {
				continue;
			}
			const entry = products.get(item.product._id) ?? {
				name: item.product.name,
				quantity: 0,
				prices: []
			};
			entry.quantity += item.quantity;
			entry.prices.push({
				amount: orderItemPrice(item, 'main'),
				currency: item.currencySnapshot.main.price.currency
			});
			products.set(item.product._id, entry);
		}
	}

	const paymentPrices = new Map<string, Price[]>();
	for (const order of paidOrders) {
		for (const payment of order.payments) {
			if (!paymentMatchesFilter(payment, filters)) {
				continue;
			}
			const key = paymentSynthesisKey(payment);
			const prices = paymentPrices.get(key) ?? [];
			prices.push(payment.currencySnapshot.main.price);
			paymentPrices.set(key, prices);
		}
	}

	return {
		orderCount: paidOrders.length,
		orderTotal: sumCurrency(
			mainCurrency,
			paidOrders.map((order) => order.currencySnapshot.main.totalPrice)
		),
		tagOrderTotal: filters.tagId
			? sumCurrency(
					mainCurrency,
					taggedItems.map((item) => ({
						amount: orderItemPrice(item, 'main'),
						currency: item.currencySnapshot.main.price.currency
					}))
			  )
			: 0,
		deliveryFeesTotal: sumCurrency(
			mainCurrency,
			paidOrders.map(
				(order) =>
					order.currencySnapshot.main.shippingPrice ?? { amount: 0, currency: mainCurrency }
			)
		),
		vatTotal: fixCurrencyRounding(
			sumCurrency(
				mainCurrency,
				filters.tagId
					? taggedItems.map((item) => ({
							amount: (orderItemPrice(item, 'main') * item.vatRate) / 100,
							currency: item.currencySnapshot.main.price.currency
					  }))
					: paidOrders.flatMap((order) => order.currencySnapshot.main.vat ?? [])
			),
			mainCurrency
		),
		products: [...products.entries()]
			.map(([productId, { name, quantity, prices }]) => ({
				productId,
				name,
				quantity,
				total: sumCurrency(mainCurrency, prices)
			}))
			.sort((a, b) => b.quantity - a.quantity),
		payments: [...paymentPrices.entries()]
			.map(([method, prices]) => ({
				method,
				quantity: prices.length,
				total: sumCurrency(mainCurrency, prices)
			}))
			.sort((a, b) => b.quantity - a.quantity)
	};
}

export function paginate<T>(rows: T[], page: number) {
	const pageCount = Math.max(1, Math.ceil(rows.length / REPORTING_PAGE_SIZE));
	const current = Math.min(Math.max(1, page), pageCount);
	return {
		rows: rows.slice((current - 1) * REPORTING_PAGE_SIZE, current * REPORTING_PAGE_SIZE),
		page: current,
		pageCount,
		total: rows.length
	};
}
