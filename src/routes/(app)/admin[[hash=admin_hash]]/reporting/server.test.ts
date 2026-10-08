import { beforeEach, describe, expect, it } from 'vitest';
import { parse } from 'devalue';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import { REPORTING_PAGE_SIZE } from '$lib/server/reporting';
import { load } from './+page.server';
import { GET } from './rows/+server';

const PERIOD = 'beginsAt=2026-09-01T00:00:00.000Z&endsAt=2026-09-30T23:59:00.000Z';
const inPeriod = new Date('2026-09-15T12:00:00.000Z');

function loadPage(query = '') {
	return load({
		url: new URL(`http://x/admin/reporting?${PERIOD}&${query}`)
	} as Parameters<typeof load>[0]);
}

async function getRows(table: string, query = '') {
	const response = await GET({
		url: new URL(`http://x/admin/reporting/rows?${PERIOD}&table=${table}&${query}`)
	} as Parameters<typeof GET>[0]);
	return parse(await response.text());
}

async function insertOrders(count: number) {
	for (let i = 0; i < count; i++) {
		await insertTestOrder({ number: i + 1, createdAt: new Date(inPeriod.getTime() - i * 1000) });
	}
}

describe('reporting page load', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('sends one page of each detail table and the full synthesis', async () => {
		await insertOrders(REPORTING_PAGE_SIZE + 5);

		const data = await loadPage();

		expect(data.orderDetail).toMatchObject({
			page: 1,
			pageCount: 2,
			total: REPORTING_PAGE_SIZE + 5
		});
		expect(data.orderDetail.rows).toHaveLength(REPORTING_PAGE_SIZE);
		expect(data.productDetail.rows).toHaveLength(REPORTING_PAGE_SIZE);
		expect(data.paymentDetail.rows).toHaveLength(REPORTING_PAGE_SIZE);
		expect(data.synthesis.orderCount).toBe(REPORTING_PAGE_SIZE + 5);
		expect(data.synthesis.products).toEqual([
			expect.objectContaining({ productId: 'test-product', quantity: REPORTING_PAGE_SIZE + 5 })
		]);
	});

	it('paginates each table independently', async () => {
		await insertOrders(REPORTING_PAGE_SIZE + 5);

		const data = await loadPage('ordersPage=2');

		expect(data.orderDetail.page).toBe(2);
		expect(data.orderDetail.rows.map((row) => row.number)).toEqual([101, 102, 103, 104, 105]);
		expect(data.productDetail.page).toBe(1);
	});

	it('clamps an out-of-range or invalid page', async () => {
		await insertOrders(3);

		expect((await loadPage('ordersPage=42')).orderDetail.page).toBe(1);
		expect((await loadPage('paymentsPage=abc')).paymentDetail.page).toBe(1);
	});

	it('serializes ids as strings', async () => {
		await insertOrders(1);

		const { paymentDetail } = await loadPage();

		expect(typeof paymentDetail.rows[0].id).toBe('string');
		expect(paymentDetail.rows[0].paymentIndex).toBe(1);
	});

	it('echoes the parsed filters for the form', async () => {
		const { filters } = await loadPage('includePending=on&employeesAlias=System');

		expect(filters.includePending).toBe(true);
		expect(filters.employeesAlias).toEqual(['System']);
		expect(filters.beginsAt).toEqual(new Date('2026-09-01T00:00:00.000Z'));
	});
});

describe('reporting rows endpoint', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('returns every row, beyond the page size', async () => {
		await insertOrders(REPORTING_PAGE_SIZE + 5);

		expect(await getRows('orders')).toHaveLength(REPORTING_PAGE_SIZE + 5);
		expect(await getRows('products')).toHaveLength(REPORTING_PAGE_SIZE + 5);
		expect(await getRows('payments')).toHaveLength(REPORTING_PAGE_SIZE + 5);
	});

	it('keeps dates as Date instances for the CSV formatting', async () => {
		await insertOrders(1);

		const [row] = await getRows('orders');

		expect(row.createdAt).toBeInstanceOf(Date);
	});

	it('applies the same filters as the page', async () => {
		await insertTestOrder({ createdAt: inPeriod });
		await insertTestOrder({ createdAt: inPeriod, status: 'canceled' });

		expect(await getRows('orders')).toHaveLength(1);
		expect(await getRows('orders', 'includeCanceled=on')).toHaveLength(2);
	});

	it('lists the paid payments to print as receipts', async () => {
		const order = await insertTestOrder({
			createdAt: inPeriod,
			payments: [{ status: 'paid' }, { status: 'canceled' }]
		});

		expect(await getRows('receipts')).toEqual([
			{ orderId: order._id, paymentId: order.payments[0]._id.toString() }
		]);
	});

	it('rejects an unknown table', async () => {
		await expect(getRows('users')).rejects.toMatchObject({ status: 400 });
	});
});
