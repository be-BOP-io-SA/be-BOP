import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb } from '$lib/server/test-utils';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { createOrder } from '$lib/server/orders';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CUSTOMER_ROLE_ID, POS_ROLE_ID } from '$lib/types/User';
import { fetchOrderForUser } from './fetchOrderForUser';

const DOWNLOAD_SECRET = 'a-secret-that-must-never-reach-the-browser';

describe('fetchOrderForUser', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne(TEST_DIGITAL_PRODUCT);
		await collections.digitalFiles.insertOne({
			_id: 'test-digital-file',
			productId: TEST_DIGITAL_PRODUCT._id,
			name: 'manual.pdf',
			storage: { key: 'digital-files/manual.pdf', size: 1024 },
			secret: DOWNLOAD_SECRET,
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	// The download endpoint takes this secret alone as the entitlement, so an unpaid buyer
	// reading it out of their own order page would walk around the paid-only gate.
	it('never exposes the digital file download secret', async () => {
		const orderId = await createOrder(
			[{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }],
			'point-of-sale',
			{
				locale: 'en',
				user: { sessionId: 'test-session-id' },
				shippingAddress: null,
				userVatCountry: 'FR'
			}
		);

		const order = await fetchOrderForUser(orderId);

		expect(order.items[0].digitalFiles).toHaveLength(1);
		expect(JSON.stringify(order)).not.toContain(DOWNLOAD_SECRET);
		expect(JSON.stringify(order)).not.toContain('digital-files/manual.pdf');
	});

	describe('staff order labels', () => {
		async function labelledOrderId() {
			const orderId = await createOrder(
				[{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }],
				'point-of-sale',
				{
					locale: 'en',
					user: { sessionId: 'test-session-id' },
					shippingAddress: null,
					userVatCountry: 'FR'
				}
			);
			await collections.orders.updateOne(
				{ _id: orderId },
				{ $set: { orderLabelIds: ['label-1'] } }
			);
			return orderId;
		}

		it('hides them from an anonymous viewer', async () => {
			const order = await fetchOrderForUser(await labelledOrderId());

			expect(order).not.toHaveProperty('orderLabelIds');
		});

		it('hides them from a customer', async () => {
			const order = await fetchOrderForUser(await labelledOrderId(), {
				userRoleId: CUSTOMER_ROLE_ID
			});

			expect(order).not.toHaveProperty('orderLabelIds');
		});

		it('shows them to staff', async () => {
			const order = await fetchOrderForUser(await labelledOrderId(), {
				userRoleId: POS_ROLE_ID
			});

			expect(order.orderLabelIds).toEqual(['label-1']);
		});
	});

	describe('pending PayPal payment', () => {
		const paypalConfig = { ...runtimeConfig.paypal };

		beforeEach(() => {
			Object.assign(runtimeConfig.paypal, { clientId: 'test-client', secret: 'test-secret' });
		});

		afterEach(() => {
			Object.assign(runtimeConfig.paypal, paypalConfig);
			vi.unstubAllGlobals();
		});

		async function orderWithPaypalCapture(captureStatus: string) {
			const orderId = await createOrder(
				[{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }],
				'point-of-sale',
				{
					locale: 'en',
					user: { sessionId: 'test-session-id' },
					shippingAddress: null,
					userVatCountry: 'FR'
				}
			);
			await collections.orders.updateOne(
				{ _id: orderId },
				{
					$set: {
						'payments.0.method': 'paypal',
						'payments.0.processor': 'paypal',
						'payments.0.checkoutId': 'PAYPAL-CHECKOUT'
					}
				}
			);
			const stored = await collections.orders.findOne({ _id: orderId });
			const price = stored?.payments[0].price;
			if (!price) {
				throw new Error('Order was created without a payment');
			}
			const amount = { currency_code: price.currency, value: String(price.amount) };

			vi.stubGlobal(
				'fetch',
				vi.fn(async (url: string) =>
					Response.json(
						url.endsWith('/v1/oauth2/token')
							? { access_token: 'test-token', expires_in: 3600 }
							: {
									id: 'PAYPAL-CHECKOUT',
									// PayPal reports the checkout COMPLETED whatever state its capture is in.
									status: 'COMPLETED',
									purchase_units: [
										{ amount, payments: { captures: [{ status: captureStatus, amount }] } }
									]
							  }
					)
				)
			);

			return orderId;
		}

		it('keeps the order pending while the capture is still PENDING', async () => {
			const orderId = await orderWithPaypalCapture('PENDING');

			const order = await fetchOrderForUser(orderId);

			expect(order.payments[0].status).toBe('pending');
			expect(order.status).toBe('pending');
		});

		it('reports the order paid once the capture is COMPLETED', async () => {
			const orderId = await orderWithPaypalCapture('COMPLETED');

			const order = await fetchOrderForUser(orderId);

			expect(order.payments[0].status).toBe('paid');
			expect(order.status).toBe('paid');
		});
	});
});
