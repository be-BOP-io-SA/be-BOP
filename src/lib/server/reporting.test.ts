import { describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('$lib/server/database', () => ({ collections: {} }));
vi.mock('$lib/server/geoip', () => ({
	countryFromIp: (ip: string) => (ip ? 'FR' : undefined)
}));

import { endOfDay, startOfDay, subMonths } from 'date-fns';
import { exchangeRate } from '$lib/stores/exchangeRate';
import { get } from 'svelte/store';
import {
	computeReportingSynthesis,
	paginate,
	parseReportingFilters,
	REPORTING_PAGE_SIZE,
	reportingOrdersQuery,
	selectOrderDetail,
	selectPaymentDetail,
	selectProductDetail,
	selectReceipts,
	toOrderRow,
	toPaymentRow,
	toProductRow,
	type ReportingOrder
} from './reporting';

type Payment = ReportingOrder['payments'][number];
type Item = ReportingOrder['items'][number];

function eur(amount: number) {
	return { amount, currency: 'EUR' as const };
}

function payment(overrides: Partial<Payment> = {}): Payment {
	return {
		_id: new ObjectId(),
		status: 'paid',
		method: 'bank-transfer',
		price: eur(10),
		currencySnapshot: { main: { price: eur(10) } } as Payment['currencySnapshot'],
		...overrides
	};
}

function item(productId: string, price: number, overrides: Partial<Item> = {}): Item {
	return {
		product: { _id: productId, name: `Product ${productId}`, tagIds: [] },
		quantity: 1,
		vatRate: 20,
		currencySnapshot: { main: { price: eur(price) } } as Item['currencySnapshot'],
		...overrides
	};
}

function order(overrides: Partial<ReportingOrder> = {}): ReportingOrder {
	return {
		_id: crypto.randomUUID(),
		number: 1,
		createdAt: new Date('2026-09-10T10:00:00Z'),
		status: 'paid',
		items: [item('coffee', 10)],
		payments: [payment()],
		currencySnapshot: {
			main: { totalPrice: eur(10), vat: [eur(1.67)] }
		} as ReportingOrder['currencySnapshot'],
		...overrides
	};
}

function filters(query = '') {
	return parseReportingFilters(new URL(`http://x/admin/reporting?${query}`), [
		'bank-transfer',
		'card',
		'point-of-sale',
		'custom'
	]);
}

describe('parseReportingFilters', () => {
	it('includes the whole last minute of a minute-precision end bound', () => {
		const { endsAt } = filters('endsAt=2026-09-10T18:30:00.000Z');
		expect(endsAt.toISOString()).toBe('2026-09-10T18:30:59.999Z');
	});

	it('reads checkbox toggles and drops empty selects', () => {
		const parsed = filters('includePending=on&paymentMethod=&tagId=');
		expect(parsed.includePending).toBe(true);
		expect(parsed.includeCanceled).toBe(false);
		expect(parsed.paymentMethod).toBeUndefined();
		expect(parsed.tagId).toBeUndefined();
	});
});

describe('reportingOrdersQuery', () => {
	it('only fetches the order statuses the page can display', () => {
		expect(reportingOrdersQuery(filters('includeCanceled=on')).status).toEqual({
			$in: ['paid', 'canceled']
		});
	});

	it('fetches every status when partially paid orders are included', () => {
		expect(reportingOrdersQuery(filters('includePartiallyPaid=on')).status).toBeUndefined();
	});

	it('matches payment method and PoS subtype on the same payment', () => {
		expect(
			reportingOrdersQuery(filters('paymentMethod=point-of-sale&posSubtype=tpe')).payments
		).toEqual({ $elemMatch: { method: 'point-of-sale', posSubtype: 'tpe' } });
		expect(reportingOrdersQuery(filters()).payments).toBeUndefined();
	});

	it('fetches expired orders by status', () => {
		expect(reportingOrdersQuery(filters('includeExpired=on')).status).toEqual({
			$in: ['paid', 'expired']
		});
	});
});

describe('detail selections', () => {
	const paid = order({ number: 1 });
	const pending = order({
		number: 2,
		status: 'pending',
		payments: [payment({ status: 'pending' })]
	});
	const partiallyPaid = order({
		number: 3,
		status: 'pending',
		payments: [payment(), payment({ status: 'pending' })]
	});
	const expired = order({
		number: 4,
		status: 'expired',
		payments: [payment({ status: 'expired' })]
	});
	const orders = [paid, pending, partiallyPaid, expired];

	it('keeps only paid orders by default', () => {
		expect(selectOrderDetail(orders, filters()).map((o) => o.number)).toEqual([1]);
	});

	it('adds orders matching each toggle', () => {
		const selected = selectOrderDetail(orders, filters('includePending=on&includeExpired=on'));
		expect(selected.map((o) => o.number)).toEqual([1, 2, 3, 4]);
		expect(
			selectOrderDetail(orders, filters('includePartiallyPaid=on')).map((o) => o.number)
		).toEqual([1, 3]);
	});

	it('lists payments of the same orders as the order detail', () => {
		const withExpiredPayment = order({
			number: 5,
			status: 'pending',
			payments: [payment({ status: 'expired' })]
		});
		const all = [...orders, withExpiredPayment];

		for (const query of ['', 'includeExpired=on', 'includePending=on&includeCanceled=on']) {
			expect(
				selectPaymentDetail(all, filters(query)).map(({ order }) => order.number),
				query
			).toEqual(
				selectOrderDetail(all, filters(query)).flatMap((o) => o.payments.map(() => o.number))
			);
		}
		expect(
			selectPaymentDetail(all, filters('includeExpired=on')).map(({ order }) => order.number)
		).toEqual([1, 4]);
	});

	it('filters payments on method and PoS subtype', () => {
		const pos = order({
			number: 5,
			payments: [
				payment({ method: 'point-of-sale', posSubtype: 'tpe' }),
				payment({ method: 'point-of-sale', posSubtype: 'other' }),
				payment({ method: 'bank-transfer' })
			]
		});
		const rows = selectPaymentDetail([pos], filters('paymentMethod=point-of-sale&posSubtype=tpe'));
		expect(rows.map(({ payment }) => payment.posSubtype)).toEqual(['tpe']);
	});

	it('keeps only tagged product lines when filtering by tag', () => {
		const mixed = order({
			items: [
				item('coffee', 10, { product: { _id: 'coffee', name: 'Coffee', tagIds: ['hot'] } }),
				item('juice', 5)
			]
		});
		const rows = selectProductDetail([mixed], filters('tagId=hot'));
		expect(rows.map(({ item }) => item.product._id)).toEqual(['coffee']);
	});

	it('lists paid payments of displayed orders as receipts', () => {
		expect(selectReceipts([partiallyPaid], filters('includePartiallyPaid=on'))).toEqual([
			{ orderId: partiallyPaid._id, paymentId: partiallyPaid.payments[0]._id.toString() }
		]);
	});
});

describe('computeReportingSynthesis', () => {
	it('sums paid orders only, whatever the detail toggles', () => {
		const synthesis = computeReportingSynthesis(
			[
				order({
					items: [item('coffee', 2, { quantity: 3 }), item('cake', 4)],
					currencySnapshot: {
						main: { totalPrice: eur(10), vat: [eur(1.67)], shippingPrice: eur(2) }
					} as ReportingOrder['currencySnapshot']
				}),
				order({ items: [item('coffee', 2)], payments: [payment({ method: 'card' })] }),
				order({ status: 'pending' })
			],
			filters('includePending=on'),
			'EUR'
		);

		expect(synthesis.orderCount).toBe(2);
		expect(synthesis.orderTotal).toBe(20);
		expect(synthesis.deliveryFeesTotal).toBe(2);
		expect(synthesis.vatTotal).toBe(3.34);
		expect(synthesis.products).toEqual([
			{ productId: 'coffee', name: 'Product coffee', quantity: 4, total: 8 },
			{ productId: 'cake', name: 'Product cake', quantity: 1, total: 4 }
		]);
		expect(synthesis.payments.map((p) => [p.method, p.quantity, p.total])).toEqual([
			['bank-transfer', 1, 10],
			['card', 1, 10]
		]);
	});

	it('rounds product totals to the main currency', () => {
		const synthesis = computeReportingSynthesis(
			[order({ items: [item('coffee', 0.1)] }), order({ items: [item('coffee', 0.2)] })],
			filters(),
			'EUR'
		);

		expect(synthesis.products[0].total).toBe(0.3);
	});

	it('restricts totals and VAT to tagged products when filtering by tag', () => {
		const tagged = item('coffee', 10, {
			product: { _id: 'coffee', name: 'Coffee', tagIds: ['hot'] },
			vatRate: 10
		});
		const synthesis = computeReportingSynthesis(
			[order({ items: [tagged, item('juice', 5)] })],
			filters('tagId=hot'),
			'EUR'
		);

		expect(synthesis.tagOrderTotal).toBe(10);
		expect(synthesis.vatTotal).toBe(1);
		expect(synthesis.products.map((p) => p.productId)).toEqual(['coffee']);
	});

	it('groups PoS payments by subtype and custom payments by label', () => {
		const synthesis = computeReportingSynthesis(
			[
				order({
					payments: [
						payment({ method: 'point-of-sale', posSubtype: 'tpe' }),
						payment({
							method: 'custom',
							customPaymentMethod: { id: 'x', label: 'Voucher', instructions: '' }
						})
					]
				})
			],
			filters(),
			'EUR'
		);

		expect(synthesis.payments.map((p) => p.method)).toEqual([
			'point-of-sale:tpe',
			'custom:Voucher'
		]);
	});
});

describe('toPaymentRow', () => {
	it('numbers payments by their position in the order', () => {
		const multi = order({ payments: [payment(), payment(), payment()] });
		expect(toPaymentRow({ order: multi, payment: multi.payments[1] }).paymentIndex).toBe(2);
	});

	it('tolerates a card payment without transactions', () => {
		const cardOrder = order({ payments: [payment({ method: 'card', transactions: [] })] });
		expect(toPaymentRow({ order: cardOrder, payment: cardOrder.payments[0] }).info).toBeUndefined();
	});
});

describe('paginate', () => {
	it('clamps out-of-range pages', () => {
		const rows = Array.from({ length: REPORTING_PAGE_SIZE + 1 }, (_, i) => i);
		expect(paginate(rows, 99)).toMatchObject({
			page: 2,
			pageCount: 2,
			total: rows.length,
			rows: [REPORTING_PAGE_SIZE]
		});
		expect(paginate([], 0)).toMatchObject({ page: 1, pageCount: 1, total: 0, rows: [] });
	});

	it('returns the requested middle page', () => {
		const rows = Array.from({ length: REPORTING_PAGE_SIZE * 3 }, (_, i) => i);
		const { rows: page, pageCount } = paginate(rows, 2);
		expect(pageCount).toBe(3);
		expect(page[0]).toBe(REPORTING_PAGE_SIZE);
		expect(page).toHaveLength(REPORTING_PAGE_SIZE);
	});

	it('does not create an empty trailing page on an exact multiple', () => {
		const rows = Array.from({ length: REPORTING_PAGE_SIZE * 2 }, (_, i) => i);
		expect(paginate(rows, 1).pageCount).toBe(2);
	});
});

describe('parseReportingFilters defaults and validation', () => {
	it('defaults to the last month, from start of day to end of today', () => {
		const { beginsAt, endsAt } = filters();
		expect(beginsAt).toEqual(startOfDay(subMonths(new Date(), 1)));
		expect(endsAt).toEqual(endOfDay(new Date()));
	});

	it('falls back to the defaults on unparseable dates', () => {
		const { beginsAt, endsAt } = filters('beginsAt=nope&endsAt=2026-13-45');
		expect(beginsAt).toEqual(startOfDay(subMonths(new Date(), 1)));
		expect(endsAt).toEqual(endOfDay(new Date()));
	});

	it('keeps an end bound that already has seconds', () => {
		expect(filters('endsAt=2026-09-10T18:30:15.000Z').endsAt.toISOString()).toBe(
			'2026-09-10T18:30:15.000Z'
		);
	});

	it('rejects a payment method that is not enabled', () => {
		expect(() => filters('paymentMethod=paypal')).toThrow();
	});

	it('reads every selected employee alias', () => {
		expect(filters('employeesAlias=alice&employeesAlias=System').employeesAlias).toEqual([
			'alice',
			'System'
		]);
	});

	it('treats any toggle value other than on/true as off', () => {
		expect(filters('includePending=off&includeCanceled=true').includePending).toBe(false);
		expect(filters('includeCanceled=true').includeCanceled).toBe(true);
	});
});

describe('reportingOrdersQuery filters', () => {
	it('bounds the creation date inclusively', () => {
		const query = reportingOrdersQuery(
			filters('beginsAt=2026-09-01T00:00:00.000Z&endsAt=2026-09-02T00:00:00.000Z')
		);
		expect(query.createdAt).toEqual({
			$gte: new Date('2026-09-01T00:00:00.000Z'),
			$lte: new Date('2026-09-02T00:00:59.999Z')
		});
	});

	it('matches orders without alias for the System employee', () => {
		expect(reportingOrdersQuery(filters('employeesAlias=System')).$or).toEqual([
			{ 'user.userAlias': { $exists: false } }
		]);
	});

	it('combines System and named employees', () => {
		expect(reportingOrdersQuery(filters('employeesAlias=System&employeesAlias=alice')).$or).toEqual(
			[{ 'user.userAlias': { $exists: false } }, { 'user.userAlias': { $in: ['alice'] } }]
		);
	});

	it('does not filter on employees when none is selected', () => {
		expect(reportingOrdersQuery(filters()).$or).toBeUndefined();
	});

	it('restricts to orders containing the tag', () => {
		expect(reportingOrdersQuery(filters('tagId=hot'))['items.product.tagIds']).toBe('hot');
		expect(reportingOrdersQuery(filters())['items.product.tagIds']).toBeUndefined();
	});

	it('adds every included order status', () => {
		expect(
			reportingOrdersQuery(filters('includePending=on&includeExpired=on&includeCanceled=on')).status
		).toEqual({ $in: ['paid', 'pending', 'expired', 'canceled'] });
	});

	it('filters on a PoS subtype alone', () => {
		expect(reportingOrdersQuery(filters('posSubtype=tpe')).payments).toEqual({
			$elemMatch: { posSubtype: 'tpe' }
		});
	});
});

describe('detail selections, other cases', () => {
	it('adds canceled orders when included', () => {
		const orders = [order({ number: 1 }), order({ number: 2, status: 'canceled' })];
		expect(selectOrderDetail(orders, filters()).map((o) => o.number)).toEqual([1]);
		expect(selectOrderDetail(orders, filters('includeCanceled=on')).map((o) => o.number)).toEqual([
			1, 2
		]);
	});

	it('applies the status toggles to product lines too', () => {
		const orders = [order({ number: 1 }), order({ number: 2, status: 'pending' })];
		expect(selectProductDetail(orders, filters()).map(({ order }) => order.number)).toEqual([1]);
		expect(
			selectProductDetail(orders, filters('includePending=on')).map(({ order }) => order.number)
		).toEqual([1, 2]);
	});

	it('keeps every product line without tag filter', () => {
		const rows = selectProductDetail([order({ items: [item('a', 1), item('b', 2)] })], filters());
		expect(rows).toHaveLength(2);
	});

	it('keeps the order sort of the query', () => {
		const orders = [order({ number: 3 }), order({ number: 1 }), order({ number: 2 })];
		expect(selectOrderDetail(orders, filters()).map((o) => o.number)).toEqual([3, 1, 2]);
	});

	it('skips unpaid payments in receipts', () => {
		const mixed = order({ payments: [payment(), payment({ status: 'canceled' })] });
		expect(selectReceipts([mixed], filters())).toHaveLength(1);
	});
});

describe('toOrderRow', () => {
	it('lists product names and falls back to the IP country', () => {
		const row = toOrderRow(order({ clientIp: '1.2.3.4', items: [item('a', 1), item('b', 2)] }));
		expect(row.productNames).toEqual(['Product a', 'Product b']);
		expect(row.ipCountry).toBe('FR');
	});

	it('has no IP country without client IP', () => {
		expect(toOrderRow(order()).ipCountry).toBeUndefined();
	});
});

describe('toProductRow', () => {
	it('prices the line after discount and free quantity', () => {
		const line = item('coffee', 10, { quantity: 3, freeQuantity: 1, discountPercentage: 50 });
		expect(toProductRow({ order: order(), item: line }).price).toBe(10);
	});

	it('prices a booking by its booked slots', () => {
		const line = item('room', 5, {
			product: { _id: 'room', name: 'Room', bookingSpec: { slotMinutes: 30 } },
			booking: {
				_id: new ObjectId(),
				start: new Date('2026-09-10T10:00:00Z'),
				end: new Date('2026-09-10T11:30:00Z')
			}
		} as Partial<Item>);
		expect(toProductRow({ order: order(), item: line }).price).toBe(15);
	});

	it('passes the deposit percentage through', () => {
		const line = item('coffee', 10, { depositPercentage: 30 });
		expect(toProductRow({ order: order(), item: line }).depositPercentage).toBe(30);
	});
});

describe('toPaymentRow details', () => {
	function info(overrides: Partial<Payment>) {
		const o = order({ payments: [payment(overrides)] });
		return toPaymentRow({ order: o, payment: o.payments[0] }).info;
	}

	it('shows the reference matching each payment method', () => {
		expect(info({ method: 'lightning', invoiceId: 'lnbc1' })).toBe('lnbc1');
		expect(info({ method: 'bank-transfer', bankTransferNumber: 'VIR-42' })).toBe('VIR-42');
		expect(
			info({
				method: 'card',
				transactions: [{ id: 't', amount: 1, currency: 'EUR', transaction_code: 'TC9' }]
			})
		).toBe('TC9');
		expect(
			info({ method: 'bitcoin', transactions: [{ id: 'txid1', amount: 1, currency: 'BTC' }] })
		).toBe('txid1');
		expect(info({ method: 'bitcoin' })).toBe('');
		expect(info({ method: 'point-of-sale', detail: 'drawer 2' })).toBe('drawer 2');
		expect(info({ method: 'point-of-sale' })).toBe('');
	});

	it('resolves the country from billing, then shipping, then IP', () => {
		const address = (country: 'DE' | 'IT') => ({
			firstName: '',
			lastName: '',
			address: '',
			city: '',
			zip: '',
			country
		});
		const row = (o: ReportingOrder) => toPaymentRow({ order: o, payment: o.payments[0] }).country;
		expect(row(order({ billingAddress: address('DE'), shippingAddress: address('IT') }))).toBe(
			'DE'
		);
		expect(row(order({ shippingAddress: address('IT'), clientIp: '1.2.3.4' }))).toBe('IT');
		expect(row(order({ clientIp: '1.2.3.4' }))).toBe('FR');
	});

	it('only sends the invoice number', () => {
		const o = order({
			payments: [payment({ invoice: { number: 12, createdAt: new Date() } })]
		});
		expect(toPaymentRow({ order: o, payment: o.payments[0] }).invoice).toEqual({ number: 12 });
	});
});

describe('computeReportingSynthesis, edge cases', () => {
	it('returns zeros without paid orders', () => {
		const synthesis = computeReportingSynthesis([order({ status: 'pending' })], filters(), 'EUR');
		expect(synthesis).toMatchObject({
			orderCount: 0,
			orderTotal: 0,
			deliveryFeesTotal: 0,
			vatTotal: 0,
			products: [],
			payments: []
		});
	});

	it('only counts payments matching the payment filter', () => {
		const synthesis = computeReportingSynthesis(
			[order({ payments: [payment({ method: 'card' }), payment({ method: 'bank-transfer' })] })],
			filters('paymentMethod=card'),
			'EUR'
		);
		expect(synthesis.payments.map((p) => p.method)).toEqual(['card']);
	});

	it('groups custom payments without label together', () => {
		const synthesis = computeReportingSynthesis(
			[order({ payments: [payment({ method: 'custom' }), payment({ method: 'custom' })] })],
			filters(),
			'EUR'
		);
		expect(synthesis.payments).toEqual([{ method: 'custom:', quantity: 2, total: 20 }]);
	});

	it('names products after their most recent order', () => {
		const synthesis = computeReportingSynthesis(
			[
				order({ items: [item('coffee', 1, { product: { _id: 'coffee', name: 'New name' } })] }),
				order({ items: [item('coffee', 1, { product: { _id: 'coffee', name: 'Old name' } })] })
			],
			filters(),
			'EUR'
		);
		expect(synthesis.products[0].name).toBe('New name');
	});

	it('sorts products and payment means by quantity', () => {
		const synthesis = computeReportingSynthesis(
			[
				order({
					items: [item('rare', 1), item('popular', 1, { quantity: 5 })],
					payments: [payment({ method: 'card' }), payment(), payment()]
				})
			],
			filters(),
			'EUR'
		);
		expect(synthesis.products.map((p) => p.productId)).toEqual(['popular', 'rare']);
		expect(synthesis.payments.map((p) => p.method)).toEqual(['bank-transfer', 'card']);
	});

	it('converts totals in other currencies to the main currency', () => {
		const rates = get(exchangeRate);
		try {
			exchangeRate.set({ ...rates, EUR: 50_000, CHF: 25_000 });
			const synthesis = computeReportingSynthesis(
				[
					order(),
					order({
						currencySnapshot: {
							main: { totalPrice: { amount: 10, currency: 'CHF' } }
						} as ReportingOrder['currencySnapshot']
					})
				],
				filters(),
				'EUR'
			);
			expect(synthesis.orderTotal).toBe(30);
		} finally {
			exchangeRate.set(rates);
		}
	});

	it('has a zero tag total when no item carries the tag', () => {
		const synthesis = computeReportingSynthesis([order()], filters('tagId=hot'), 'EUR');
		expect(synthesis.tagOrderTotal).toBe(0);
		expect(synthesis.products).toEqual([]);
	});
});
