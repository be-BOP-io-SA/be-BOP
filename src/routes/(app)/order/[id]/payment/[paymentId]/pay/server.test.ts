import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collections } from '$lib/server/database';
import { ORIGIN } from '$lib/server/env-config';
import { createOrder } from '$lib/server/orders';
import { runtimeConfig } from '$lib/server/runtime-config';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { cleanDb } from '$lib/server/test-utils';
import { load } from './+page.server';

describe('pay page', () => {
	const stripeConfig = { ...runtimeConfig.stripe };

	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne(TEST_DIGITAL_PRODUCT);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => Response.json({ status: 'requires_payment_method' }))
		);
	});

	afterEach(() => {
		runtimeConfig.stripe = { ...stripeConfig };
		vi.unstubAllGlobals();
	});

	async function pendingCardPayment(processor: 'stripe' | 'sumup') {
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
		const order = await collections.orders.findOne({ _id: orderId });
		const paymentId = String(order?.payments[0]._id);
		await collections.orders.updateOne(
			{ _id: orderId },
			{
				$set: {
					'payments.0.method': 'card',
					'payments.0.processor': processor,
					'payments.0.checkoutId': 'CHECKOUT',
					'payments.0.clientSecret': 'CLIENT-SECRET',
					'payments.0.address': `${ORIGIN}/order/${orderId}/payment/${paymentId}/pay`
				}
			}
		);

		return load({ params: { id: orderId, paymentId }, depends: () => undefined } as never);
	}

	it('hands the Stripe form the public key and the client secret of the payment', async () => {
		runtimeConfig.stripe = { ...stripeConfig, secretKey: 'sk_test', publicKey: 'pk_test' };

		const data = await pendingCardPayment('stripe');

		expect(data.payData).toEqual({ publicKey: 'pk_test', clientSecret: 'CLIENT-SECRET' });
		expect(JSON.stringify(data)).not.toContain('sk_test');
	});

	it('hands the SumUp form the checkout to pay', async () => {
		const data = await pendingCardPayment('sumup');

		expect(data.payData).toEqual({ checkoutId: 'CHECKOUT' });
	});
});
