import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import * as ordersModule from '$lib/server/orders';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { cleanDb } from '$lib/server/test-utils';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { amountToMinor } from '$lib/server/api/v1/orders/money';
import type { AuthenticatedApiKey } from '$lib/types/ApiV1';

const apiKey: AuthenticatedApiKey = {
	_id: new ObjectId(),
	name: 'till',
	scopes: ['orders:write', 'pos:write'],
	keyPrefix: 'bebop_ak_test_syncfail1'
};

// Only the key lookup is replaced: routes, handler, writes and the database are the real ones.
vi.mock('$lib/server/api/v1/auth', () => ({ requireApiKey: async () => apiKey }));

import { POST as postOrders } from './orders/+server';
import { POST as postPosSales } from './pos/orders/+server';

const price = amountToMinor(TEST_DIGITAL_PRODUCT.price.amount, 'EUR');

async function call(handler: typeof postOrders, path: string, body: unknown) {
	const url = `http://localhost${path}`;
	const res = await handler({
		request: new Request(url, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		}),
		url: new URL(url),
		locals: { apiKey, clientIp: '203.0.113.50' }
	} as unknown as Parameters<typeof postOrders>[0]);
	return { http: res.status, body: await res.json() };
}

const ordersBody = (externalOrderId: string) => ({
	orders: [
		{
			externalOrderId,
			currency: 'EUR',
			items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
			payment: { method: 'point-of-sale', status: 'paid', amountMinor: price, currency: 'EUR' }
		}
	]
});
const posBody = (externalOrderId: string) => [
	{
		externalOrderId,
		soldAt: new Date().toISOString(),
		method: 'cashless',
		totalPrice: { amountMinor: price, currency: 'EUR' },
		items: [
			{
				product: TEST_DIGITAL_PRODUCT._id,
				quantity: 1,
				price: { amountMinor: price, currency: 'EUR' }
			}
		]
	}
];

/** The payment is recorded by one write that marks it paid: make that write, and only it, fail. */
function failPaymentWrite() {
	const original = collections.orders.findOneAndUpdate.bind(collections.orders);
	return vi.spyOn(collections.orders, 'findOneAndUpdate').mockImplementation(((
		filter: unknown,
		update: { $set?: Record<string, unknown> },
		...rest: unknown[]
	) => {
		if (update?.$set?.['payments.$.status'] === 'paid') {
			return Promise.reject(new Error('database write refused'));
		}
		return (original as (...args: unknown[]) => unknown)(filter, update, ...rest);
	}) as never);
}

/** The read that tells the caller where the order stands fails as well. */
function failStatusReadBack() {
	const original = collections.orders.findOne.bind(collections.orders);
	return vi.spyOn(collections.orders, 'findOne').mockImplementation(((
		filter: unknown,
		options?: { projection?: Record<string, unknown> }
	) => {
		const projection = options?.projection;
		if (projection && Object.keys(projection).join() === 'status') {
			return Promise.reject(new Error('database read refused'));
		}
		return (original as (...args: unknown[]) => unknown)(filter, options);
	}) as never);
}

async function stored(externalOrderId: string) {
	const orders = await collections.orders.find({ externalOrderId }).toArray();
	return {
		count: orders.length,
		orderStatus: orders[0]?.status,
		paymentStatuses: orders[0]?.payments.map((payment) => payment.status),
		invoiced: orders[0]?.payments.some((payment) => payment.invoice),
		totalReceived: orders[0]?.currencySnapshot.main.totalReceived
	};
}

describe('a payment be-BOP cannot record after it created the order', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne({ ...TEST_DIGITAL_PRODUCT });
		const now = new Date();
		await collections.posPaymentSubtypes.insertOne({
			_id: new ObjectId(),
			slug: 'cashless',
			name: 'Cashless',
			sortOrder: 0,
			createdAt: now,
			updatedAt: now
		});
		apiKey._id = new ObjectId();
		runtimeConfig.mainCurrency = 'EUR';
		runtimeConfig.secondaryCurrency = 'USD';
		runtimeConfig.vatExempted = true;
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
	}, 60_000);

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('POST /api/v1/orders', () => {
		it('answers created with the order pending and PAYMENT_SYNC_FAILED, never paid', async () => {
			const spy = failPaymentWrite();
			const first = await call(postOrders, '/api/v1/orders', ordersBody('sync-orders-1'));
			spy.mockRestore();

			expect(first.http).toBe(200);
			expect(first.body.results[0]).toMatchObject({
				status: 'created',
				orderStatus: 'pending',
				warnings: [{ code: 'PAYMENT_SYNC_FAILED' }]
			});
			expect(first.body.results[0].orderStatus).not.toBe('paid');
			expect(await stored('sync-orders-1')).toEqual({
				count: 1,
				orderStatus: 'pending',
				paymentStatuses: ['pending'],
				invoiced: false,
				totalReceived: undefined
			});
		});

		it('still says pending when the order cannot be read back after the failed payment write', async () => {
			const writeSpy = failPaymentWrite();
			const readSpy = failStatusReadBack();
			const first = await call(postOrders, '/api/v1/orders', ordersBody('sync-orders-3'));
			writeSpy.mockRestore();
			readSpy.mockRestore();

			expect(first.body.results[0]).toMatchObject({ status: 'created', orderStatus: 'pending' });
		});

		it('answers pending too when the second of two payments cannot be added', async () => {
			vi.spyOn(ordersModule, 'addOrderPayment').mockRejectedValue(new Error('payment add refused'));
			const [first] = ordersBody('sync-orders-4').orders;
			const res = await call(postOrders, '/api/v1/orders', {
				orders: [
					{
						...first,
						payment: undefined,
						payments: [
							{ ...first.payment, amountMinor: price / 2, externalPaymentId: 'p1' },
							{ ...first.payment, amountMinor: price / 2, externalPaymentId: 'p2' }
						]
					}
				]
			});

			expect(res.body.results[0]).toMatchObject({
				status: 'created',
				orderStatus: 'pending',
				warnings: expect.arrayContaining([expect.objectContaining({ code: 'PAYMENT_SYNC_FAILED' })])
			});
			expect((await stored('sync-orders-4')).orderStatus).toBe('pending');
		});

		it('refuses the same sale sent again, naming the order, and writes no second one', async () => {
			const spy = failPaymentWrite();
			const first = await call(postOrders, '/api/v1/orders', ordersBody('sync-orders-2'));
			spy.mockRestore();

			const again = await call(postOrders, '/api/v1/orders', ordersBody('sync-orders-2'));

			expect(again.body.results[0]).toMatchObject({
				status: 'failed',
				error: {
					code: 'DUPLICATE_EXTERNAL_ORDER_ID',
					details: { orderId: first.body.results[0].orderId }
				}
			});
			expect((await stored('sync-orders-2')).count).toBe(1);
			expect((await stored('sync-orders-2')).orderStatus).toBe('pending');
		});
	});

	describe('POST /api/v1/pos/orders', () => {
		it('answers pending, never success, and says why', async () => {
			const spy = failPaymentWrite();
			const first = await call(postPosSales, '/api/v1/pos/orders', posBody('sync-pos-1'));
			spy.mockRestore();

			expect(first.http).toBe(200);
			expect(first.body.results).toHaveLength(1);
			expect(first.body.results[0]).toMatchObject({
				externalOrderId: 'sync-pos-1',
				status: 'pending',
				warnings: [{ code: 'PAYMENT_SYNC_FAILED' }]
			});
			expect(first.body.results[0].status).not.toBe('success');
			expect(await stored('sync-pos-1')).toEqual({
				count: 1,
				orderStatus: 'pending',
				paymentStatuses: ['pending'],
				invoiced: false,
				totalReceived: undefined
			});
		});

		it('still says pending when the order cannot be read back after the failed payment write', async () => {
			const writeSpy = failPaymentWrite();
			const readSpy = failStatusReadBack();
			const first = await call(postPosSales, '/api/v1/pos/orders', posBody('sync-pos-3'));
			writeSpy.mockRestore();
			readSpy.mockRestore();

			expect(first.body.results[0]).toMatchObject({
				externalOrderId: 'sync-pos-3',
				status: 'pending'
			});
		});

		it('answers conflict, not success, for the same sale sent again, and writes no second order', async () => {
			const spy = failPaymentWrite();
			const first = await call(postPosSales, '/api/v1/pos/orders', posBody('sync-pos-2'));
			spy.mockRestore();

			const again = await call(postPosSales, '/api/v1/pos/orders', posBody('sync-pos-2'));

			expect(again.http).toBe(200);
			expect(again.body.results[0]).toMatchObject({
				externalOrderId: 'sync-pos-2',
				status: 'conflict',
				orderId: first.body.results[0].orderId
			});
			expect(again.body.results[0].status).not.toBe('success');
			expect((await stored('sync-pos-2')).count).toBe(1);
			expect((await stored('sync-pos-2')).orderStatus).toBe('pending');
		});
	});
});
