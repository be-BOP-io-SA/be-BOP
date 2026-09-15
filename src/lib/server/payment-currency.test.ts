import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from './test-utils';
import { collections } from './database';
import { TEST_DIGITAL_PRODUCT } from './seed/product';
import { addOrderPayment, createOrder, onOrderPayment } from './orders';
import { runtimeConfig } from './runtime-config';
import { registerProcessor } from './sdk/pp';
import PPTaler from './sdk/contrib/PPTaler';
import PPOsb from './sdk/contrib/PPOsb';
import { exchangeRate } from '$lib/stores/exchangeRate';
import { get } from 'svelte/store';
import type { CreatePaymentParams, PaymentProcessorDefinition } from './sdk/pp';
import type { Currency } from '$lib/types/Currency';
import type { Order } from '$lib/types/Order';

/**
 * A stand-in registered over the `taler` slot, which no other test exercises and which
 * is disabled by default. Restored after each test so the real registry is untouched.
 */
function useFakeProcessor(over: Partial<PaymentProcessorDefinition> = {}) {
	const seen: CreatePaymentParams[] = [];

	registerProcessor({
		meta: { processor: 'taler', method: 'taler' },
		isEnabled: () => true,
		settlementCurrency: () => 'CHF',
		async createPayment(params) {
			seen.push(params);
			return { processor: 'taler', address: 'fake' };
		},
		async checkPayment() {
			return { status: 'pending' };
		},
		...over
	} as PaymentProcessorDefinition);

	return seen;
}

async function createTalerOrder(): Promise<Order> {
	const orderId = await createOrder([{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }], 'taler', {
		locale: 'en',
		user: { sessionId: 'test-session-id' },
		notifications: { paymentStatus: { email: 'test@example.com' } },
		shippingAddress: null,
		userVatCountry: 'FR'
	});

	const order = await collections.orders.findOne({ _id: orderId });
	if (!order) {
		throw new Error('Order not found');
	}
	return order;
}

describe('payment currency', () => {
	const shopCurrencies = {
		main: runtimeConfig.mainCurrency,
		secondary: runtimeConfig.secondaryCurrency,
		priceReference: runtimeConfig.priceReferenceCurrency,
		accounting: runtimeConfig.accountingCurrency
	};
	const preferences = runtimeConfig.paymentProcessorPreferences;
	const paymentTimeout = runtimeConfig.desiredPaymentTimeout;

	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertOne(TEST_DIGITAL_PRODUCT);
	});

	afterEach(() => {
		registerProcessor(PPTaler);
		registerProcessor(PPOsb);
		runtimeConfig.paymentProcessorPreferences = preferences;
		runtimeConfig.mainCurrency = shopCurrencies.main;
		runtimeConfig.secondaryCurrency = shopCurrencies.secondary;
		runtimeConfig.priceReferenceCurrency = shopCurrencies.priceReference;
		runtimeConfig.accountingCurrency = shopCurrencies.accounting;
		runtimeConfig.desiredPaymentTimeout = paymentTimeout;
	});

	describe('settlement', () => {
		it('hands createPayment an amount already in the settlement currency', async () => {
			const seen = useFakeProcessor();

			await createTalerOrder();

			// The product costs 0.004 BTC and cleanDb pins 1 BTC = 30 000 CHF.
			expect(seen).toHaveLength(1);
			expect(seen[0].toPay).toEqual({ amount: 120, currency: 'CHF' });
		});

		it('records the same amount it asked the provider for', async () => {
			const seen = useFakeProcessor();

			const order = await createTalerOrder();

			expect(order.payments[0].price).toEqual(seen[0].toPay);
		});

		it('survives an exchange rate refresh during the provider round-trip', async () => {
			const seen = useFakeProcessor({
				async createPayment(params) {
					seen.push(params);
					// The currency lock refreshing rates while the provider call is in flight.
					// Mutated in place: the store and runtimeConfig.exchangeRate share one object,
					// which cleanDb relies on to reset rates between tests.
					get(exchangeRate).CHF = 60_000;
					return { processor: 'taler', address: 'fake' };
				}
			});

			const order = await createTalerOrder();

			expect(order.payments[0].price).toEqual(seen[0].toPay);
			expect(order.payments[0].price.amount).toBe(120);
		});

		it('books the payment in the order currencies, not the settlement one', async () => {
			useFakeProcessor();

			const order = await createTalerOrder();
			const snapshot = order.payments[0].currencySnapshot;

			expect(order.payments[0].price.currency).toBe('CHF');
			expect(snapshot.main.price).toEqual(order.currencySnapshot.main.totalPrice);
			expect(snapshot.priceReference.price.currency).toBe(
				order.currencySnapshot.priceReference.totalPrice.currency
			);
		});

		it('follows a processor that changes its settlement currency', async () => {
			let currency: Currency = 'CHF';
			const seen = useFakeProcessor({ settlementCurrency: () => currency });

			await createTalerOrder();
			expect(seen[0].toPay.currency).toBe('CHF');

			currency = 'SAT';
			const order = await createTalerOrder();

			expect(seen[1].toPay).toEqual({ amount: 400_000, currency: 'SAT' });
			expect(order.payments[0].price.currency).toBe('SAT');
		});
	});

	describe('minimumAmount', () => {
		it('refuses an amount below what the processor accepts', async () => {
			useFakeProcessor({ minimumAmount: () => 1_000 });

			await expect(createTalerOrder()).rejects.toThrow();
		});

		it('accepts an amount at the minimum', async () => {
			useFakeProcessor({ minimumAmount: () => 120 });

			await expect(createTalerOrder()).resolves.toBeDefined();
		});

		it('falls back to one currency unit when the processor declares none', async () => {
			useFakeProcessor({ settlementCurrency: () => 'SAT' });

			const order = await createTalerOrder();

			expect(order.payments[0].price.amount).toBe(400_000);
		});
	});

	describe('expiresIn', () => {
		it('lets the processor cap the expiry', async () => {
			const capped = new Date('2030-01-01T00:00:00Z');
			useFakeProcessor({ expiresIn: () => capped });

			const order = await createTalerOrder();

			expect(order.payments[0].expiresAt).toEqual(capped);
		});

		it('applies the shop timeout when the processor declares nothing', async () => {
			useFakeProcessor();

			const before = Date.now();
			const order = await createTalerOrder();
			const expiresAt = order.payments[0].expiresAt?.getTime() ?? 0;

			expect(expiresAt).toBeGreaterThanOrEqual(
				before + runtimeConfig.desiredPaymentTimeout * 60_000 - 5_000
			);
		});

		it('only caps payments the declaring processor actually handles', async () => {
			// A cap belongs to the processor resolved for the payment, not to any processor
			// merely configured for the method.
			const capped = new Date('2030-01-01T00:00:00Z');
			useFakeProcessor({ expiresIn: () => capped });
			registerProcessor({
				meta: { processor: 'osb', method: 'taler' },
				isEnabled: () => true,
				settlementCurrency: () => 'CHF',
				async createPayment() {
					return { processor: 'osb' };
				},
				async checkPayment() {
					return { status: 'pending' };
				}
			} as PaymentProcessorDefinition);
			runtimeConfig.paymentProcessorPreferences = { taler: 'osb' };

			const order = await createTalerOrder();

			expect(order.payments[0].processor).toBe('osb');
			expect(order.payments[0].expiresAt).not.toEqual(capped);
		});
	});

	describe('totalReceived', () => {
		it('books into the order currency even after the shop changes its own', async () => {
			runtimeConfig.mainCurrency = 'EUR';
			useFakeProcessor();
			const order = await createTalerOrder();
			const frozen = order.currencySnapshot.main.totalPrice.currency;

			expect(frozen).toBe('EUR');
			runtimeConfig.mainCurrency = 'USD';
			await onOrderPayment(order, order.payments[0], order.payments[0].price);

			const paid = await collections.orders.findOne({ _id: order._id });

			expect(paid?.currencySnapshot.main.totalReceived?.currency).toBe(frozen);
		});

		it('books every axis the order carries, accounting included', async () => {
			runtimeConfig.accountingCurrency = 'USD';
			useFakeProcessor();

			const order = await createTalerOrder();
			await onOrderPayment(order, order.payments[0], order.payments[0].price);

			const paid = await collections.orders.findOne({ _id: order._id });

			expect(paid?.currencySnapshot.accounting?.totalReceived?.currency).toBe('USD');
		});
	});

	describe('partial payments', () => {
		it('keeps every payment booked in the order currencies', async () => {
			useFakeProcessor();
			const order = await createTalerOrder();
			const half = {
				amount: order.currencySnapshot.main.totalPrice.amount / 2,
				currency: order.currencySnapshot.main.totalPrice.currency
			};

			await addOrderPayment(order, 'taler', half, { ignorePendingPayments: true });

			const updated = await collections.orders.findOne({ _id: order._id });
			const currencies = updated?.payments.map((p) => p.currencySnapshot.main.price.currency);

			expect(currencies).toEqual([
				order.currencySnapshot.main.totalPrice.currency,
				order.currencySnapshot.main.totalPrice.currency
			]);
		});
	});
});
