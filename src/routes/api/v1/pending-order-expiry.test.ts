import { beforeAll, beforeEach, afterEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { subMinutes } from 'date-fns';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { amountToMinor } from '$lib/server/api/v1/orders/money';
import { paymentMethodExpiration } from '$lib/server/orders';
import type { AuthenticatedApiKey } from '$lib/types/ApiV1';

const apiKey: AuthenticatedApiKey = {
	_id: new ObjectId(),
	name: 'till',
	scopes: ['orders:write', 'pos:write'],
	keyPrefix: 'bebop_ak_test_expiry001'
};

vi.mock('$lib/server/api/v1/auth', () => ({ requireApiKey: async () => apiKey }));
// The order routine runs here for real; only its cluster lock is taken for granted.
vi.mock('$lib/server/lock', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/server/lock')>()),
	Lock: class {
		ownsLock = true;
	}
}));

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

const ordersBody = (externalOrderId: string, amountMinor = price, status = 'paid') => ({
	orders: [
		{
			externalOrderId,
			currency: 'EUR',
			items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
			payment: { method: 'point-of-sale', status, amountMinor, currency: 'EUR' }
		}
	]
});
const posBody = (externalOrderId: string, amountMinor = price) => [
	{
		externalOrderId,
		soldAt: new Date().toISOString(),
		method: 'cashless',
		totalPrice: { amountMinor, currency: 'EUR' },
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

async function stored(externalOrderId: string) {
	const order = await collections.orders.findOne({ externalOrderId });
	return {
		orderStatus: order?.status,
		paymentStatuses: order?.payments.map((payment) => payment.status),
		hasDeadline: !!order?.payments[0]?.expiresAt,
		marked: !!order?.payments[0]?.expireAtDeadline,
		received: order?.payments[0]?.currencySnapshot.main.received?.amount
	};
}

/** The deadline of the shop goes by: only the date moves, as it would with time. */
async function letDeadlinePass(externalOrderId: string) {
	await collections.orders.updateOne(
		{ externalOrderId },
		{ $set: { 'payments.0.expiresAt': subMinutes(new Date(), 1) } }
	);
}

/**
 * The order routine polls every 2 s. An overdue marked order inserted after the others is settled
 * only by a round that started after they existed, so once it expires, they have all been seen.
 */
async function afterARound() {
	const sentinel = await insertTestOrder({
		status: 'pending',
		payments: [
			{
				status: 'pending',
				method: 'point-of-sale',
				expiresAt: subMinutes(new Date(), 1),
				expireAtDeadline: true
			}
		]
	});
	const statusOf = async () => (await collections.orders.findOne({ _id: sentinel._id }))?.status;
	await vi.waitFor(async () => expect(await statusOf()).toBe('expired'), { timeout: 15_000 });
	// Seen by the round that expired it; one more, started after this one, to be certain.
	const second = await insertTestOrder({
		status: 'pending',
		payments: [
			{
				status: 'pending',
				method: 'point-of-sale',
				expiresAt: subMinutes(new Date(), 1),
				expireAtDeadline: true
			}
		]
	});
	await vi.waitFor(
		async () =>
			expect((await collections.orders.findOne({ _id: second._id }))?.status).toBe('expired'),
		{ timeout: 15_000 }
	);
}

describe('when a pending order of a till expires', () => {
	beforeAll(async () => {
		await cleanDb();
		await import('$lib/server/locks/order-lock');
	});

	beforeEach(async () => {
		await collections.orders.deleteMany({});
		await collections.products.deleteMany({});
		await collections.posPaymentSubtypes.deleteMany({});
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
		vi.spyOn(console, 'log').mockImplementation(() => undefined);
	}, 60_000);

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('a partial payment, 90 sent for 100 expected', () => {
		it('through /pos/orders: pending with the shop deadline, expired by the order routine', async () => {
			const first = await call(postPosSales, '/api/v1/pos/orders', posBody('exp-pos-1', 9000));
			expect(first.body.results[0]).toMatchObject({ status: 'pending' });
			const written = await stored('exp-pos-1');
			expect(written).toEqual({
				orderStatus: 'pending',
				paymentStatuses: ['pending'],
				hasDeadline: true,
				marked: true,
				received: 90
			});

			await letDeadlinePass('exp-pos-1');
			await vi.waitFor(
				async () => expect((await stored('exp-pos-1')).orderStatus).toBe('expired'),
				{ timeout: 15_000 }
			);
			expect((await stored('exp-pos-1')).paymentStatuses).toEqual(['expired']);

			// The id stays taken: the till cannot send the sale again.
			const again = await call(postPosSales, '/api/v1/pos/orders', posBody('exp-pos-1', price));
			expect(again.body.results[0]).toMatchObject({
				status: 'conflict',
				orderId: first.body.results[0].orderId
			});
			expect(await collections.orders.countDocuments({ externalOrderId: 'exp-pos-1' })).toBe(1);
		}, 60_000);

		it('through /orders: the same, and the id is refused as a duplicate afterwards', async () => {
			const first = await call(postOrders, '/api/v1/orders', ordersBody('exp-ord-1', 9000));
			expect(first.body.results[0]).toMatchObject({ status: 'created', orderStatus: 'pending' });
			expect(await stored('exp-ord-1')).toMatchObject({ hasDeadline: true, marked: true });

			await letDeadlinePass('exp-ord-1');
			await vi.waitFor(
				async () => expect((await stored('exp-ord-1')).orderStatus).toBe('expired'),
				{ timeout: 15_000 }
			);

			const again = await call(postOrders, '/api/v1/orders', ordersBody('exp-ord-1', price));
			expect(again.body.results[0]).toMatchObject({
				status: 'failed',
				error: {
					code: 'DUPLICATE_EXTERNAL_ORDER_ID',
					details: { orderId: first.body.results[0].orderId }
				}
			});
			expect(await collections.orders.countDocuments({ externalOrderId: 'exp-ord-1' })).toBe(1);
		}, 60_000);

		it('takes its deadline from the delay of the shop', async () => {
			const before = Date.now();
			await call(postOrders, '/api/v1/orders', ordersBody('exp-ord-2', 9000));
			const order = await collections.orders.findOne({ externalOrderId: 'exp-ord-2' });

			const wait = (order?.payments[0].expiresAt?.getTime() ?? 0) - before;
			expect(wait).toBeGreaterThanOrEqual(runtimeConfig.desiredPaymentTimeout * 60_000 - 1000);
			expect(wait).toBeLessThanOrEqual(runtimeConfig.desiredPaymentTimeout * 60_000 + 5000);
		});
	});

	describe('an order whose payment could not be recorded (payment sync failure)', () => {
		it('stays pending with the shop deadline, and expires once it has passed', async () => {
			const spy = failPaymentWrite();
			const pos = await call(postPosSales, '/api/v1/pos/orders', posBody('stuck-pos-1'));
			const orders = await call(postOrders, '/api/v1/orders', ordersBody('stuck-ord-1'));
			spy.mockRestore();

			// What the till is told does not change.
			expect(pos.body.results[0]).toMatchObject({
				status: 'pending',
				warnings: [{ code: 'PAYMENT_SYNC_FAILED' }]
			});
			expect(orders.body.results[0]).toMatchObject({
				orderStatus: 'pending',
				warnings: [{ code: 'PAYMENT_SYNC_FAILED' }]
			});
			for (const id of ['stuck-pos-1', 'stuck-ord-1']) {
				expect(await stored(id)).toMatchObject({
					orderStatus: 'pending',
					paymentStatuses: ['pending'],
					hasDeadline: true,
					marked: true
				});
			}

			// Before the deadline the shop may still confirm the payment: the routine leaves it be.
			await afterARound();
			expect(await stored('stuck-pos-1')).toMatchObject({ orderStatus: 'pending' });

			await letDeadlinePass('stuck-pos-1');
			await letDeadlinePass('stuck-ord-1');
			for (const id of ['stuck-pos-1', 'stuck-ord-1']) {
				await vi.waitFor(async () => expect((await stored(id)).orderStatus).toBe('expired'), {
					timeout: 15_000
				});
			}
		}, 90_000);

		it('is still told pending when the deadline cannot be written either', async () => {
			const paymentWrite = failPaymentWrite();
			const original = collections.orders.updateOne.bind(collections.orders);
			const deadlineWrite = vi.spyOn(collections.orders, 'updateOne').mockImplementation(((
				filter: unknown,
				update: { $set?: Record<string, unknown> },
				...rest: unknown[]
			) => {
				if (update?.$set?.['payments.$.expireAtDeadline']) {
					return Promise.reject(new Error('database write refused'));
				}
				return (original as (...args: unknown[]) => unknown)(filter, update, ...rest);
			}) as never);
			const pos = await call(postPosSales, '/api/v1/pos/orders', posBody('stuck-pos-2'));
			const orders = await call(postOrders, '/api/v1/orders', ordersBody('stuck-ord-4'));
			paymentWrite.mockRestore();
			deadlineWrite.mockRestore();

			expect(pos.body.results[0]).toMatchObject({
				status: 'pending',
				warnings: [{ code: 'PAYMENT_SYNC_FAILED' }]
			});
			expect(orders.body.results[0]).toMatchObject({
				status: 'created',
				orderStatus: 'pending',
				warnings: [{ code: 'PAYMENT_SYNC_FAILED' }]
			});
			// Nothing could be written: the order is left as the first failure left it.
			expect(await stored('stuck-pos-2')).toMatchObject({
				orderStatus: 'pending',
				hasDeadline: false,
				marked: false
			});
		});

		it('then blocks the id: the sale cannot be sent again, nor ever completed through the API', async () => {
			const spy = failPaymentWrite();
			await call(postOrders, '/api/v1/orders', ordersBody('stuck-ord-3'));
			spy.mockRestore();

			const again = await call(postPosSales, '/api/v1/pos/orders', posBody('stuck-ord-3'));

			expect(again.body.results[0]).toMatchObject({ status: 'conflict' });
		});
	});

	describe('a payment the till sends as pending', () => {
		it('gets the shop deadline, and expires with its order once it has passed', async () => {
			const before = Date.now();
			const first = await call(
				postOrders,
				'/api/v1/orders',
				ordersBody('pending-ord-1', price, 'pending')
			);
			expect(first.body.results[0]).toMatchObject({ status: 'created', orderStatus: 'pending' });
			expect(await stored('pending-ord-1')).toEqual({
				orderStatus: 'pending',
				paymentStatuses: ['pending'],
				hasDeadline: true,
				marked: true,
				received: undefined
			});
			const order = await collections.orders.findOne({ externalOrderId: 'pending-ord-1' });
			const wait = (order?.payments[0].expiresAt?.getTime() ?? 0) - before;
			expect(wait).toBeGreaterThanOrEqual(runtimeConfig.desiredPaymentTimeout * 60_000 - 1000);

			await letDeadlinePass('pending-ord-1');
			await vi.waitFor(
				async () => expect((await stored('pending-ord-1')).orderStatus).toBe('expired'),
				{ timeout: 15_000 }
			);
			expect((await stored('pending-ord-1')).paymentStatuses).toEqual(['expired']);
		}, 60_000);
	});

	describe('the exceptions to expiry that exist today', () => {
		it('never give a deadline to bank transfer, point-of-sale or custom payments, whatever the delay asked', () => {
			// Bank transfer and custom methods only exist once the shop has set them up.
			const { sellerIdentity, customPaymentMethods } = runtimeConfig;
			runtimeConfig.sellerIdentity = {
				...sellerIdentity,
				bank: { iban: 'CH9300762011623852957', bic: 'POFICHBEXXX' }
			} as never;
			runtimeConfig.customPaymentMethods = [{ id: 'm', label: 'M', instructions: 'i' }] as never;
			onTestFinished(() => {
				runtimeConfig.sellerIdentity = sellerIdentity;
				runtimeConfig.customPaymentMethods = customPaymentMethods;
			});

			for (const method of ['bank-transfer', 'point-of-sale', 'custom'] as const) {
				expect(paymentMethodExpiration(method), method).toBeUndefined();
				// The delay an employee may ask for at the till does not change that.
				expect(paymentMethodExpiration(method, { paymentTimeout: 5 }), method).toBeUndefined();
			}
			// Any other method takes the delay of the shop, or the one the employee asked for.
			expect(paymentMethodExpiration('bitcoin')).toBeInstanceOf(Date);
			expect(paymentMethodExpiration('card', { paymentTimeout: 5 })).toBeInstanceOf(Date);
		});

		it('leave a pending bank transfer and a staff-added payment untouched by the routine', async () => {
			const transfer = await insertTestOrder({
				status: 'pending',
				createdAt: subMinutes(new Date(), 60 * 24 * 30),
				payments: [{ status: 'pending', method: 'bank-transfer', paidAt: undefined }]
			});
			const staffAdded = await insertTestOrder({
				status: 'pending',
				createdAt: subMinutes(new Date(), 60 * 24 * 30),
				payments: [{ status: 'pending', method: 'point-of-sale', paidAt: undefined }]
			});

			await afterARound();

			for (const order of [transfer, staffAdded]) {
				expect((await collections.orders.findOne({ _id: order._id }))?.status).toBe('pending');
			}
		}, 60_000);
	});
});
