import { describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('$lib/server/database', () => ({ collections: {} }));
vi.mock('$lib/server/geoip', () => ({ countryFromIp: () => 'FR' }));

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
	toPaymentRow,
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
});
