import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	InvoicePendingError,
	NetworkError,
	RevokedError,
	type Invoice,
	type Order as SattlemeOrder,
	type PaymentStatus
} from '@sattleme/checkout';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { createOrder } from '$lib/server/orders';
import { runtimeConfig } from '$lib/server/runtime-config';
import { testProcessorConnection } from '$lib/server/sdk/test-connection';
import type { Order } from '$lib/types/Order';
import type { PaymentMethod } from '$lib/server/payment-methods';
import PPSattleme from './processor.server';
import PPSattlemeOnchain from '../sattleme-onchain/processor.server';
import { resetSattlemeChecks, sattlemeMetaOf } from './sattleme.server';

const KEY = 'sattleme_ck_test';
const BOLT11 = 'lnbc4m1ptest';
const REST_BOLT11 = 'lnbc1m1prest';
const ADDRESS = 'bc1ptestaddress';

const fake = vi.hoisted(() => ({
	createInvoice: vi.fn(),
	getStatus: vi.fn(),
	merchant: vi.fn(),
	keys: [] as string[]
}));

vi.mock('@sattleme/checkout', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@sattleme/checkout')>();

	class FakeSattleme {
		constructor(options: { key: string }) {
			fake.keys.push(options.key);
		}
		createInvoice(...args: unknown[]) {
			return fake.createInvoice(...args);
		}
		getStatus(...args: unknown[]) {
			return fake.getStatus(...args);
		}
		merchant(...args: unknown[]) {
			return fake.merchant(...args);
		}
	}

	return { ...actual, Sattleme: FakeSattleme };
});

/** What the package answers for an order, with a deposit address unless told otherwise. */
function invoiceOf(order: SattlemeOrder, { address = true, bolt11 = true } = {}): Invoice {
	const now = Math.floor(Date.now() / 1000);
	const sats = String(order.sats);

	return {
		ref: order.ref,
		bolt11: bolt11 ? BOLT11 : null,
		paymentHash: bolt11 ? 'a'.repeat(64) : null,
		verifyUrl: bolt11 ? 'https://breez.tips/lnurlp/verify/aaaa' : null,
		onchainAddress: address ? ADDRESS : null,
		paymentUri: address
			? `bitcoin:${ADDRESS}?amount=0.004${bolt11 ? `&lightning=${BOLT11}` : ''}`
			: `lightning:${BOLT11}`,
		sats,
		fiat: null,
		rate: null,
		note: order.note ?? order.ref,
		createdAt: now,
		expiresAt: now + (order.durationSeconds ?? 900),
		checkoutUrl: null,
		redirectUrl: null
	};
}

async function orderPaidWith(method: PaymentMethod): Promise<Order> {
	const orderId = await createOrder([{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }], method, {
		locale: 'en',
		user: { sessionId: 'test-session-id' },
		notifications: { paymentStatus: { email: 'test@example.com' } },
		shippingAddress: null,
		userVatCountry: 'FR'
	});
	const order = await collections.orders.findOne({ _id: orderId });
	if (!order) {
		throw new Error('Order not created');
	}
	return order;
}

describe('sattle.me', () => {
	const config = { ...runtimeConfig.sattleme };
	const preferences = runtimeConfig.paymentProcessorPreferences;
	const smtpFake = runtimeConfig.smtp.fake;
	const paymentTimeout = runtimeConfig.desiredPaymentTimeout;

	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne(TEST_DIGITAL_PRODUCT);
		resetSattlemeChecks();
		fake.createInvoice.mockReset();
		fake.getStatus.mockReset();
		fake.merchant.mockReset();
		fake.createInvoice.mockImplementation(async (order: SattlemeOrder) => invoiceOf(order));
		runtimeConfig.sattleme = { integrationKey: KEY, onchain: true };
		runtimeConfig.paymentProcessorPreferences = {
			lightning: 'sattleme',
			bitcoin: 'sattleme-onchain'
		};
		// createOrder refuses an e-mail contact unless e-mail can be sent.
		runtimeConfig.smtp.fake = true;
	});

	afterEach(() => {
		runtimeConfig.sattleme = config;
		runtimeConfig.paymentProcessorPreferences = preferences;
		runtimeConfig.smtp.fake = smtpFake;
		runtimeConfig.desiredPaymentTimeout = paymentTimeout;
	});

	describe('Lightning', () => {
		it('makes one invoice per payment, in sats, for an hour at most, and keeps it server side', async () => {
			runtimeConfig.desiredPaymentTimeout = 120;
			const order = await orderPaidWith('lightning');
			const payment = order.payments[0];

			expect(payment.processor).toBe('sattleme');
			expect(payment.address).toBe(BOLT11);
			expect(fake.createInvoice).toHaveBeenCalledTimes(1);

			const asked = fake.createInvoice.mock.calls[0][0] as SattlemeOrder;
			expect(asked.ref).toBe(`order-${order.number}-${payment._id.toString()}`);
			expect(asked.ref).toMatch(/^[A-Za-z0-9._:-]{1,64}$/);
			expect(asked.sats).toBe(400_000);
			expect(asked.durationSeconds).toBeGreaterThan(3500);
			expect(asked.durationSeconds).toBeLessThanOrEqual(3600);
			expect(payment.expiresAt && payment.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(
				3600_000
			);
			expect(sattlemeMetaOf(payment).invoice.ref).toBe(asked.ref);
			// The Lightning invoice alone: the deposit address sattle.me leased too is never shown.
			expect(PPSattleme.presentation?.qrLink?.(payment)).toBe(`lightning:${BOLT11}`);
		});

		it('takes over an invoice an earlier attempt of the same payment already declared', async () => {
			fake.createInvoice.mockImplementation(async (order: SattlemeOrder) => {
				const { rate, checkoutUrl, redirectUrl, ...declared } = invoiceOf(order); // eslint-disable-line @typescript-eslint/no-unused-vars
				throw new InvoicePendingError({ ...declared, bolt11: 'lnbc-earlier', declaredAt: 0 });
			});

			const order = await orderPaidWith('lightning');

			expect(order.payments[0].address).toBe('lnbc-earlier');
		});

		it('refuses an invoice the merchant can only take on-chain', async () => {
			fake.createInvoice.mockImplementation(async (order: SattlemeOrder) =>
				invoiceOf(order, { bolt11: false })
			);

			await expect(orderPaidWith('lightning')).rejects.toThrow();
		});

		it('settles a Lightning payment with its preimage, kept with the payment', async () => {
			const order = await orderPaidWith('lightning');
			const payment = order.payments[0];
			fake.getStatus.mockResolvedValue({
				state: 'paid',
				method: 'lightning',
				preimage: 'b'.repeat(64)
			} satisfies PaymentStatus);

			await expect(PPSattleme.checkPayment(payment, order)).resolves.toEqual({
				status: 'paid',
				received: { amount: 400_000, currency: 'SAT' },
				transactions: [
					{ id: 'a'.repeat(64), reference: 'b'.repeat(64), amount: 400_000, currency: 'SAT' }
				]
			});
			const stored = await collections.orders.findOne({ _id: order._id });
			expect(stored && sattlemeMetaOf(stored.payments[0]).paid).toMatchObject({
				preimage: 'b'.repeat(64)
			});
		});

		it('holds an on-chain payment awaiting its confirmations, and checks it again later only', async () => {
			const order = await orderPaidWith('lightning');
			const payment = order.payments[0];
			fake.getStatus.mockResolvedValue({
				state: 'unconfirmed',
				received: '400000',
				confirmations: 1,
				txids: ['c'.repeat(64)]
			} satisfies PaymentStatus);

			const first = await PPSattleme.checkPayment(payment, order);
			const second = await PPSattleme.checkPayment(payment, order);

			expect(first).toMatchObject({
				status: 'pending',
				provisional: { received: { amount: 400_000, currency: 'SAT' } }
			});
			expect(second).toEqual(first);
			expect(fake.getStatus).toHaveBeenCalledTimes(1);
		});

		it('shows the rest of an underpayment as a Lightning invoice alone', async () => {
			const order = await orderPaidWith('lightning');
			const payment = order.payments[0];
			const restUri = `bitcoin:${ADDRESS}?amount=0.001&lightning=${REST_BOLT11}`;
			fake.getStatus.mockResolvedValue({
				state: 'open',
				expiresAt: Math.floor(Date.now() / 1000) + 600,
				received: '300000',
				rest: { sats: '100000', bolt11: REST_BOLT11, paymentUri: restUri }
			} satisfies PaymentStatus);

			await expect(PPSattleme.checkPayment(payment, order)).resolves.toEqual({
				status: 'pending'
			});

			const stored = await collections.orders.findOne({ _id: order._id });
			const storedPayment = stored?.payments[0];
			expect(storedPayment?.address).toBe(REST_BOLT11);
			expect(storedPayment && PPSattleme.presentation?.qrLink?.(storedPayment)).toBe(
				`lightning:${REST_BOLT11}`
			);
		});

		it('keeps a payment pending while sattle.me does not answer, and fails on what will not change', async () => {
			const order = await orderPaidWith('lightning');
			const payment = order.payments[0];

			fake.getStatus.mockRejectedValueOnce(new NetworkError('relays down'));
			await expect(PPSattleme.checkPayment(payment, order)).resolves.toEqual({
				status: 'pending'
			});

			resetSattlemeChecks();
			fake.getStatus.mockRejectedValueOnce(new RevokedError());
			await expect(PPSattleme.checkPayment(payment, order)).rejects.toBeInstanceOf(RevokedError);
		});

		it('expires a payment sattle.me says expired, noting what the merchant received', async () => {
			const order = await orderPaidWith('lightning');
			fake.getStatus.mockResolvedValue({ state: 'expired', received: '1500' });

			await expect(PPSattleme.checkPayment(order.payments[0], order)).resolves.toEqual({
				status: 'expired'
			});
			const stored = await collections.orders.findOne({ _id: order._id });
			expect(stored?.notes?.at(-1)?.content).toContain('1500 sats were received on-chain');
		});
	});

	describe('on-chain', () => {
		it('shows the leased deposit address', async () => {
			const order = await orderPaidWith('bitcoin');
			const payment = order.payments[0];

			expect(payment.processor).toBe('sattleme-onchain');
			expect(payment.address).toBe(ADDRESS);
			// The address and its amount alone: the Lightning invoice sattle.me made too is never shown.
			expect(PPSattlemeOnchain.presentation?.qrLink?.(payment)).toBe(
				`bitcoin:${ADDRESS}?amount=0.004`
			);
			expect(PPSattlemeOnchain.presentation?.qrPayload?.(payment)).toBe(
				`bitcoin:${ADDRESS}?amount=0.004`
			);
		});

		it('shows the rest of an underpayment as an on-chain amount alone', async () => {
			const order = await orderPaidWith('bitcoin');
			const payment = order.payments[0];
			fake.getStatus.mockResolvedValue({
				state: 'open',
				expiresAt: Math.floor(Date.now() / 1000) + 600,
				received: '300000',
				rest: {
					sats: '100000',
					bolt11: REST_BOLT11,
					paymentUri: `bitcoin:${ADDRESS}?amount=0.001&lightning=${REST_BOLT11}`
				}
			} satisfies PaymentStatus);

			await expect(PPSattlemeOnchain.checkPayment?.(payment, order)).resolves.toEqual({
				status: 'pending'
			});

			const stored = await collections.orders.findOne({ _id: order._id });
			const storedPayment = stored?.payments[0];
			expect(storedPayment?.address).toBe(ADDRESS);
			expect(storedPayment && PPSattlemeOnchain.presentation?.qrLink?.(storedPayment)).toBe(
				`bitcoin:${ADDRESS}?amount=0.001`
			);
		});

		it('refuses an invoice without a deposit address', async () => {
			fake.createInvoice.mockImplementation(async (order: SattlemeOrder) =>
				invoiceOf(order, { address: false })
			);

			await expect(orderPaidWith('bitcoin')).rejects.toThrow();
		});

		it('takes new payments only once the shop ticks on-chain payments', () => {
			runtimeConfig.sattleme = { integrationKey: KEY, onchain: false };

			expect(PPSattlemeOnchain.isEnabled()).toBe(true);
			expect(PPSattlemeOnchain.acceptsNewPayments?.()).toBe(false);
		});

		it('settles an on-chain payment with its transactions', async () => {
			const order = await orderPaidWith('bitcoin');
			fake.getStatus.mockResolvedValue({
				state: 'paid',
				method: 'onchain',
				received: '395000',
				txids: ['d'.repeat(64)]
			} satisfies PaymentStatus);

			await expect(PPSattlemeOnchain.checkPayment(order.payments[0], order)).resolves.toEqual({
				status: 'paid',
				received: { amount: 395_000, currency: 'SAT' },
				transactions: [
					{ id: 'd'.repeat(64), reference: 'd'.repeat(64), amount: 395_000, currency: 'SAT' }
				]
			});
		});
	});

	describe('connection test', () => {
		it('reads the merchant without making any invoice', async () => {
			fake.merchant.mockResolvedValue({
				businessName: 'Shop',
				minSats: '1',
				maxSats: '1000000',
				onchainAddresses: 12
			});

			await expect(testProcessorConnection('sattleme')).resolves.toEqual({ ok: true });
			expect(fake.createInvoice).not.toHaveBeenCalled();
		});

		it('fails without a working integration, or without deposit addresses when on-chain is ticked', async () => {
			vi.spyOn(console, 'error').mockImplementation(() => undefined);

			fake.merchant.mockRejectedValueOnce(new RevokedError());
			await expect(testProcessorConnection('sattleme')).resolves.toMatchObject({ ok: false });

			fake.merchant.mockResolvedValueOnce({
				businessName: 'Shop',
				minSats: '1',
				maxSats: '1000000',
				onchainAddresses: 0
			});
			await expect(testProcessorConnection('sattleme')).resolves.toMatchObject({ ok: false });
			expect(fake.createInvoice).not.toHaveBeenCalled();
		});
	});
});
