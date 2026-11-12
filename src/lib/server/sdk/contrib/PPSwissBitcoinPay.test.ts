import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { createOrder } from '$lib/server/orders';
import { runtimeConfig } from '$lib/server/runtime-config';
import { toSatoshis } from '$lib/utils/toSatoshis';
import type { Order } from '$lib/types/Order';
import PPSwissBitcoinPay from './PPSwissBitcoinPay';

const INVOICE = 'lnbc-swiss-bitcoin-pay-test';

/** Answers the checkout creation, and the status request with the given body */
function mockSwissBitcoinPay(status: Record<string, unknown> = {}) {
	const created: Array<Record<string, unknown>> = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			if (url.endsWith('/checkout') && init?.method === 'POST') {
				created.push(JSON.parse(String(init.body)));
				return Response.json({ id: 'sbp-1', pr: INVOICE, checkoutUrl: 'https://example.com' });
			}
			return Response.json(status);
		})
	);
	return created;
}

function paymentOf(invoiceId: string) {
	return { invoiceId } as Order['payments'][number];
}

describe('Swiss Bitcoin Pay', () => {
	const config = { ...runtimeConfig.swissBitcoinPay };
	const preferences = runtimeConfig.paymentProcessorPreferences;
	const smtpFake = runtimeConfig.smtp.fake;

	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne(TEST_DIGITAL_PRODUCT);
		runtimeConfig.swissBitcoinPay = { ...config, apiKey: 'test-key' };
		runtimeConfig.paymentProcessorPreferences = { lightning: 'swiss-bitcoin-pay' };
		// createOrder refuses an e-mail contact unless e-mail can be sent, which otherwise depends on the machine's SMTP env.
		runtimeConfig.smtp.fake = true;
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		runtimeConfig.swissBitcoinPay = config;
		runtimeConfig.paymentProcessorPreferences = preferences;
		runtimeConfig.smtp.fake = smtpFake;
	});

	it('asks for the order price in satoshis, as the processor did when it converted it itself', async () => {
		const created = mockSwissBitcoinPay();

		const orderId = await createOrder(
			[{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }],
			'lightning',
			{
				locale: 'en',
				user: { sessionId: 'test-session-id' },
				notifications: { paymentStatus: { email: 'test@example.com' } },
				shippingAddress: null,
				userVatCountry: 'FR'
			}
		);

		const order = await collections.orders.findOne({ _id: orderId });
		expect(order?.payments[0].processor).toBe('swiss-bitcoin-pay');
		expect(order?.payments[0].address).toBe(INVOICE);
		expect(created).toHaveLength(1);
		expect(created[0]).toMatchObject({
			amount: toSatoshis(
				order?.currencySnapshot.main.totalPrice.amount ?? 0,
				order?.currencySnapshot.main.totalPrice.currency ?? 'SAT'
			),
			unit: 'sat'
		});
		expect(created[0].amount).toBe(400_000);
	});

	it('reads a paid checkout that states its unit', async () => {
		mockSwissBitcoinPay({ isPaid: true, amount: 400_000, unit: 'sat' });

		await expect(PPSwissBitcoinPay.checkPayment(paymentOf('sbp-1'), {} as Order)).resolves.toEqual({
			status: 'paid',
			received: { amount: 400_000, currency: 'SAT' }
		});
	});

	it('reads a paid checkout that only states the unit of its fiat side', async () => {
		mockSwissBitcoinPay({ isPaid: true, amount: 0.004, fiatAmount: 400_000, fiatUnit: 'sat' });

		await expect(PPSwissBitcoinPay.checkPayment(paymentOf('sbp-1'), {} as Order)).resolves.toEqual({
			status: 'paid',
			received: { amount: 400_000, currency: 'SAT' }
		});
	});

	it('refuses a paid checkout in a unit it does not know', async () => {
		mockSwissBitcoinPay({ isPaid: true, amount: 1, unit: 'doge' });

		await expect(PPSwissBitcoinPay.checkPayment(paymentOf('sbp-1'), {} as Order)).rejects.toThrow(
			'unexpected currency DOGE'
		);
	});
});
