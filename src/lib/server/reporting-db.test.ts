import { beforeEach, describe, expect, it } from 'vitest';
import { addMinutes, subMinutes } from 'date-fns';
import { collections } from './database';
import { cleanDb, insertTestOrder } from './test-utils';
import { fetchReportingOrders, parseReportingFilters } from './reporting';

const BEGINS_AT = '2026-09-01T00:00:00.000Z';
const ENDS_AT = '2026-09-30T23:59:00.000Z';

function fetchOrders(query = '') {
	const url = new URL(`http://x/admin/reporting?beginsAt=${BEGINS_AT}&endsAt=${ENDS_AT}&${query}`);
	return fetchReportingOrders(
		parseReportingFilters(url, ['bank-transfer', 'card', 'point-of-sale'])
	);
}

const inPeriod = new Date('2026-09-15T12:00:00.000Z');

describe('fetchReportingOrders', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('only loads the fields the reporting reads', async () => {
		await insertTestOrder({ createdAt: inPeriod });

		const [order] = await fetchOrders();

		expect(order.items[0].product).toEqual({
			_id: 'test-product',
			name: 'Test product',
			tagIds: undefined
		});
		expect(order.items[0].currencySnapshot).toEqual({
			main: { price: { amount: 10, currency: 'EUR' } }
		});
		expect(order.payments[0]).not.toHaveProperty('clientSecret');
		expect(order.payments[0].currencySnapshot).not.toHaveProperty('priceReference');
		expect(order).not.toHaveProperty('locale');
	});

	it('includes both period bounds, down to the last millisecond of the end minute', async () => {
		const begin = new Date(BEGINS_AT);
		const endMinute = new Date(ENDS_AT);
		await insertTestOrder({ number: 1, createdAt: subMinutes(begin, 1) });
		await insertTestOrder({ number: 2, createdAt: begin });
		await insertTestOrder({ number: 3, createdAt: new Date(endMinute.getTime() + 59_999) });
		await insertTestOrder({ number: 4, createdAt: addMinutes(endMinute, 1) });

		expect((await fetchOrders()).map((o) => o.number).sort()).toEqual([2, 3]);
	});

	it('sorts orders from newest to oldest', async () => {
		await insertTestOrder({ number: 1, createdAt: new Date('2026-09-02T00:00:00Z') });
		await insertTestOrder({ number: 2, createdAt: new Date('2026-09-20T00:00:00Z') });
		await insertTestOrder({ number: 3, createdAt: new Date('2026-09-10T00:00:00Z') });

		expect((await fetchOrders()).map((o) => o.number)).toEqual([2, 3, 1]);
	});

	it('loads unpaid orders only when a toggle asks for them', async () => {
		await insertTestOrder({ number: 1, createdAt: inPeriod });
		await insertTestOrder({
			number: 2,
			createdAt: inPeriod,
			status: 'pending',
			payments: [{ status: 'paid' }, { status: 'pending' }]
		});
		await insertTestOrder({ number: 3, createdAt: inPeriod, status: 'canceled' });

		const numbers = async (query: string) => (await fetchOrders(query)).map((o) => o.number).sort();
		expect(await numbers('')).toEqual([1]);
		expect(await numbers('includeCanceled=on')).toEqual([1, 3]);
		expect(await numbers('includePartiallyPaid=on')).toEqual([1, 2, 3]);
	});

	it('requires the PoS subtype on the payment that has the method', async () => {
		await insertTestOrder({
			number: 1,
			createdAt: inPeriod,
			payments: [
				{ method: 'point-of-sale', posSubtype: 'cash' },
				{ method: 'card', posSubtype: 'terminal' }
			]
		});
		await insertTestOrder({
			number: 2,
			createdAt: inPeriod,
			payments: [{ method: 'point-of-sale', posSubtype: 'terminal' }]
		});

		const orders = await fetchOrders('paymentMethod=point-of-sale&posSubtype=terminal');
		expect(orders.map((o) => o.number)).toEqual([2]);
	});

	it('filters on the employee who created the order', async () => {
		await insertTestOrder({ number: 1, createdAt: inPeriod, user: { userAlias: 'alice' } });
		await insertTestOrder({ number: 2, createdAt: inPeriod, user: { userAlias: 'bob' } });
		await insertTestOrder({ number: 3, createdAt: inPeriod, user: {} });

		const numbers = async (query: string) => (await fetchOrders(query)).map((o) => o.number).sort();
		expect(await numbers('employeesAlias=alice')).toEqual([1]);
		expect(await numbers('employeesAlias=System')).toEqual([3]);
		expect(await numbers('employeesAlias=System&employeesAlias=bob')).toEqual([2, 3]);
	});

	it('keeps only orders containing a product with the tag', async () => {
		const tagged = await insertTestOrder({ number: 1, createdAt: inPeriod });
		await insertTestOrder({ number: 2, createdAt: inPeriod });
		await collections.orders.updateOne(
			{ _id: tagged._id },
			{ $set: { 'items.0.product.tagIds': ['hot'] } }
		);

		const orders = await fetchOrders('tagId=hot');
		expect(orders.map((o) => o.number)).toEqual([1]);
		expect(orders[0].items[0].product.tagIds).toEqual(['hot']);
	});
});
