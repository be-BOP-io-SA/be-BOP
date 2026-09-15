import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from './test-utils';
import { collections } from './database';
import { TEST_DIGITAL_PRODUCT } from './seed/product';
import { addOrderPayment, createOrder, onOrderPayment, paymentMethodExpiration } from './orders';
import { runtimeConfig } from './runtime-config';
import { registerProcessor } from './sdk/pp';
import PPTaler from './sdk/contrib/PPTaler';
import PPOsb from './sdk/contrib/PPOsb';
import { exchangeRate } from '$lib/stores/exchangeRate';
import { get } from 'svelte/store';
import type { CreatePaymentParams, PaymentProcessorDefinition } from './sdk/pp';
import type { PaymentMethod } from './payment-methods';
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

async function createOrderWith(method: PaymentMethod): Promise<Order> {
	const orderId = await createOrder([{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }], method, {
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

			await createOrderWith('taler');

			// The product costs 0.004 BTC and cleanDb pins 1 BTC = 30 000 CHF.
			expect(seen).toHaveLength(1);
			expect(seen[0].toPay).toEqual({ amount: 120, currency: 'CHF' });
		});

		it('records the same amount it asked the provider for', async () => {
			const seen = useFakeProcessor();

			const order = await createOrderWith('taler');

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

			const order = await createOrderWith('taler');

			expect(order.payments[0].price).toEqual(seen[0].toPay);
			expect(order.payments[0].price.amount).toBe(120);
		});

		it('books the payment in the order currencies, not the settlement one', async () => {
			useFakeProcessor();

			const order = await createOrderWith('taler');
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

			await createOrderWith('taler');
			expect(seen[0].toPay.currency).toBe('CHF');

			currency = 'SAT';
			const order = await createOrderWith('taler');

			expect(seen[1].toPay).toEqual({ amount: 400_000, currency: 'SAT' });
			expect(order.payments[0].price.currency).toBe('SAT');
		});
	});

	describe('expiresIn', () => {
		it('lets the processor cap the expiry', async () => {
			const capped = new Date('2030-01-01T00:00:00Z');
			useFakeProcessor({ expiresIn: () => capped });

			const order = await createOrderWith('taler');

			expect(order.payments[0].expiresAt).toEqual(capped);
		});

		it('applies the shop timeout when the processor declares nothing', async () => {
			useFakeProcessor();

			const before = Date.now();
			const order = await createOrderWith('taler');
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

			const order = await createOrderWith('taler');

			expect(order.payments[0].processor).toBe('osb');
			expect(order.payments[0].expiresAt).not.toEqual(capped);
		});
	});

	describe('totalReceived', () => {
		it('books into the order currency even after the shop changes its own', async () => {
			runtimeConfig.mainCurrency = 'EUR';
			useFakeProcessor();
			const order = await createOrderWith('taler');
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

			const order = await createOrderWith('taler');
			await onOrderPayment(order, order.payments[0], order.payments[0].price);

			const paid = await collections.orders.findOne({ _id: order._id });

			expect(paid?.currencySnapshot.accounting?.totalReceived?.currency).toBe('USD');
		});
	});

	describe('methods settled by hand', () => {
		const sellerIdentity = runtimeConfig.sellerIdentity;
		const customMethods = runtimeConfig.customPaymentMethods;

		afterEach(() => {
			runtimeConfig.sellerIdentity = sellerIdentity;
			runtimeConfig.customPaymentMethods = customMethods;
		});

		it('settles point-of-sale in the shop currency, with no deadline', async () => {
			const order = await createOrderWith('point-of-sale');
			const payment = order.payments[0];

			expect(payment.processor).toBe('point-of-sale');
			expect(payment.price.currency).toBe(order.currencySnapshot.main.totalPrice.currency);
			expect(payment.expiresAt).toBeUndefined();
		});

		it('still hands bank-transfer the seller IBAN', async () => {
			runtimeConfig.sellerIdentity = {
				bank: { iban: 'FR7630001007941234567890185', bic: 'BDFEFRPP' }
			} as typeof runtimeConfig.sellerIdentity;

			const order = await createOrderWith('bank-transfer');

			expect(order.payments[0].address).toBe('FR7630001007941234567890185');
			expect(order.payments[0].expiresAt).toBeUndefined();
		});

		it('gives custom payments no deadline either', async () => {
			runtimeConfig.customPaymentMethods = [
				{ id: 'cheque', label: 'Cheque', instructions: 'Post it' }
			];

			const order = await createOrderWith('custom');

			expect(order.payments[0].processor).toBe('custom');
			expect(order.payments[0].expiresAt).toBeUndefined();
		});

		it('keeps the deadline free payments always had', () => {
			// createOrder refuses 'free' on a priced order, so the rule is checked where it lives.
			expect(paymentMethodExpiration('free')).toBeInstanceOf(Date);
		});

		it('gives the hand-settled methods no deadline', () => {
			runtimeConfig.sellerIdentity = {
				bank: { iban: 'FR76', bic: 'BDFEFRPP' }
			} as typeof runtimeConfig.sellerIdentity;
			runtimeConfig.customPaymentMethods = [{ id: 'c', label: 'C', instructions: '' }];

			expect(paymentMethodExpiration('point-of-sale')).toBeUndefined();
			expect(paymentMethodExpiration('bank-transfer')).toBeUndefined();
			expect(paymentMethodExpiration('custom')).toBeUndefined();
		});

		it('books them in every currency the order carries', async () => {
			runtimeConfig.accountingCurrency = 'USD';

			const order = await createOrderWith('point-of-sale');
			const snapshot = order.payments[0].currencySnapshot;

			expect(snapshot.main.price).toEqual(order.currencySnapshot.main.totalPrice);
			expect(snapshot.accounting?.price.currency).toBe('USD');
		});
	});

	describe('partial payments', () => {
		it('keeps every payment booked in the order currencies', async () => {
			useFakeProcessor();
			const order = await createOrderWith('taler');
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
