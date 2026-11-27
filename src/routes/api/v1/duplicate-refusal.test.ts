import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
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
	name: 'front desk till',
	scopes: ['orders:write', 'pos:write'],
	keyPrefix: 'bebop_ak_test_dupref001'
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

const order = (externalOrderId: string, status = 'paid', amountMinor = price) => ({
	externalOrderId,
	currency: 'EUR',
	items: [{ productId: TEST_DIGITAL_PRODUCT._id, quantity: 1 }],
	payment: { method: 'point-of-sale', status, amountMinor, currency: 'EUR' }
});
const sale = (externalOrderId: string) => ({
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
});

const sendOrders = (...orders: ReturnType<typeof order>[]) =>
	call(postOrders, '/api/v1/orders', { orders });
const sendSales = (...sales: ReturnType<typeof sale>[]) =>
	call(postPosSales, '/api/v1/pos/orders', sales);

/** What the shop sees when the order a till names has gone by its deadline. */
async function expire(externalOrderId: string) {
	await collections.orders.updateOne(
		{ externalOrderId },
		{ $set: { status: 'expired', 'payments.$[].status': 'expired' } }
	);
}

describe('a sale refused as already received', () => {
	let warn: MockInstance<typeof console.warn>;
	const refusalLines = () =>
		warn.mock.calls.filter(
			([message]: unknown[]) => message === '[api/v1] sale refused as already received'
		);

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
		warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
	}, 60_000);

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('POST /api/v1/orders', () => {
		it('says nothing more about a paid order than before, and logs the refusal once', async () => {
			const first = await sendOrders(order('dup-paid'));
			const orderId = first.body.results[0].orderId;

			const again = await sendOrders(order('dup-paid'));

			expect(again.body.results[0]).toEqual({
				externalOrderId: 'dup-paid',
				status: 'failed',
				error: {
					code: 'DUPLICATE_EXTERNAL_ORDER_ID',
					message: expect.not.stringContaining('expired'),
					details: { orderId }
				}
			});
			expect(refusalLines()).toHaveLength(1);
		});

		it('says nothing more about an order still waiting for its payment', async () => {
			await sendOrders(order('dup-pending', 'pending'));

			const again = await sendOrders(order('dup-pending', 'pending'));

			expect(again.body.results[0].error.details).toEqual({
				orderId: expect.any(String)
			});
			expect(again.body.results[0].error.message).not.toContain('expired');
		});

		it('says the order has expired when it has, with the same code', async () => {
			const first = await sendOrders(order('dup-expired', 'pending'));
			await expire('dup-expired');

			const again = await sendOrders(order('dup-expired', 'pending'));

			expect(again.http).toBe(200);
			expect(again.body.results[0]).toMatchObject({
				status: 'failed',
				error: {
					code: 'DUPLICATE_EXTERNAL_ORDER_ID',
					message: expect.stringContaining(
						'The order it names has expired: no payment was recorded as paid on it.'
					),
					details: { orderId: first.body.results[0].orderId, orderExpired: true }
				}
			});
			expect(await collections.orders.countDocuments({ externalOrderId: 'dup-expired' })).toBe(1);
		});

		it('does not say nothing was received for a sale that fell short: its amount stays on the payment', async () => {
			const first = await sendOrders(order('dup-short', 'paid', 100));
			expect(first.body.results[0]).toMatchObject({ orderStatus: 'pending' });
			// What the order routine does once the shop's deadline is past.
			const stored = await collections.orders.findOne({ externalOrderId: 'dup-short' });
			const expired = await ordersModule.expireUnfollowedPayment(
				stored as NonNullable<typeof stored>,
				(stored as NonNullable<typeof stored>).payments[0],
				new Date(Date.now() + 24 * 3600 * 1000)
			);
			expect(expired?.status).toBe('expired');

			const again = await sendOrders(order('dup-short', 'paid', 100));

			expect(again.body.results[0]).toMatchObject({
				status: 'failed',
				error: {
					code: 'DUPLICATE_EXTERNAL_ORDER_ID',
					message: expect.stringContaining(
						'The order it names has expired: no payment was recorded as paid on it.'
					),
					details: { orderId: first.body.results[0].orderId, orderExpired: true }
				}
			});
			expect(again.body.results[0].error.message).not.toContain('nothing was paid');
			const after = await collections.orders.findOne({ externalOrderId: 'dup-short' });
			expect(after?.payments.map((payment) => payment.status)).toEqual(['expired']);
			expect(after?.payments[0].currencySnapshot.main.received?.amount).toBe(1);
		});

		it('refuses each repeated sale of a batch on its own and writes the new one', async () => {
			await sendOrders(order('batch-paid'), order('batch-expired', 'pending'));
			await expire('batch-expired');
			warn.mockClear();

			const res = await sendOrders(order('batch-paid'), order('batch-new'), order('batch-expired'));

			expect(res.body.results.map((result: { status: string }) => result.status)).toEqual([
				'failed',
				'created',
				'failed'
			]);
			expect(res.body.results[0].error.details).not.toHaveProperty('orderExpired');
			expect(res.body.results[2].error.details.orderExpired).toBe(true);
			expect(refusalLines()).toHaveLength(2);
		});
	});

	describe('POST /api/v1/pos/orders', () => {
		it('stays a conflict with no extra field for a paid order', async () => {
			const first = await sendSales(sale('pos-paid'));
			const orderId = first.body.results[0].orderId;

			const again = await sendSales(sale('pos-paid'));

			expect(again.body.results[0]).toEqual({
				externalOrderId: 'pos-paid',
				status: 'conflict',
				orderId,
				orderUrl: expect.stringContaining(orderId)
			});
			expect(refusalLines()).toHaveLength(1);
		});

		it('stays a conflict, and says the order has expired, when it has', async () => {
			const first = await sendSales(sale('pos-expired'));
			await expire('pos-expired');

			const again = await sendSales(sale('pos-expired'));

			expect(again.http).toBe(200);
			expect(again.body.results[0]).toMatchObject({
				status: 'conflict',
				orderId: first.body.results[0].orderId,
				orderExpired: true
			});
		});

		it('answers each sale of a partly received batch on its own, one log line per refusal', async () => {
			await sendSales(sale('pos-batch-a'), sale('pos-batch-b'));
			await expire('pos-batch-b');
			warn.mockClear();

			const res = await sendSales(sale('pos-batch-a'), sale('pos-batch-c'), sale('pos-batch-b'));

			expect(res.body.results.map((result: { status: string }) => result.status)).toEqual([
				'conflict',
				'success',
				'conflict'
			]);
			expect(res.body.results[0]).not.toHaveProperty('orderExpired');
			expect(res.body.results[2].orderExpired).toBe(true);
			expect(refusalLines()).toHaveLength(2);
		});
	});

	describe('the line in the server log', () => {
		it('names the key, the external id, the existing order and its status, and no secret', async () => {
			const first = await sendOrders(order('log-1', 'pending'));
			await expire('log-1');
			warn.mockClear();

			await sendOrders(order('log-1', 'pending'));

			expect(refusalLines()).toEqual([
				[
					'[api/v1] sale refused as already received',
					{
						apiKeyId: apiKey._id.toString(),
						apiKeyName: 'front desk till',
						externalOrderId: 'log-1',
						orderId: first.body.results[0].orderId,
						orderStatus: 'expired'
					}
				]
			]);
			expect(JSON.stringify(warn.mock.calls)).not.toMatch(/keyHash|secret|bebop_ak_/);
		});

		it('is not written for a sale that is accepted', async () => {
			await sendOrders(order('log-fresh'));
			await sendSales(sale('log-fresh-pos'));

			expect(refusalLines()).toHaveLength(0);
		});
	});
});
