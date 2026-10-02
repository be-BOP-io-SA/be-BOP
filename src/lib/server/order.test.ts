import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanDb, createDiscount, createPaidSubscription } from './test-utils';
import { collections } from './database';
import {
	TEST_DIGITAL_PRODUCT,
	TEST_DIGITAL_PRODUCT_UNLIMITED,
	TEST_DISCOUNTED_PRODUCT,
	TEST_PHYSICAL_PRODUCT,
	TEST_SUBSCRIPTION_PRODUCT,
	TEST_VARIATION_PRODUCT
} from './seed/product';
import { addOrderPayment, createOrder, lastInvoiceNumber, onOrderPayment } from './orders';
import { orderAmountWithNoPaymentsCreated, orderIndividualItemPrice } from '$lib/types/Order';
import { runtimeConfig } from './runtime-config';
import { toCurrency } from '$lib/utils/toCurrency';

describe('order', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertMany([
			TEST_DIGITAL_PRODUCT,
			TEST_DIGITAL_PRODUCT_UNLIMITED,
			TEST_SUBSCRIPTION_PRODUCT,
			TEST_DISCOUNTED_PRODUCT,
			TEST_PHYSICAL_PRODUCT,
			TEST_VARIATION_PRODUCT
		]);
	});

	describe('onOrderPaid', () => {
		it('should save currency snapshot', async () => {
			const orderId = await createOrder(
				[
					{
						product: TEST_DIGITAL_PRODUCT,
						quantity: 1
					}
				],
				'point-of-sale',
				{
					locale: 'en',
					user: {
						sessionId: 'test-session-id'
					},
					shippingAddress: null,
					userVatCountry: 'FR'
				}
			);

			let order = await collections.orders.findOne({ _id: orderId });

			if (!order) {
				throw new Error('Order not found');
			}

			await onOrderPayment(order, order.payments[0], order.payments[0].price);

			order = await collections.orders.findOne({ _id: orderId });

			expect(order?.currencySnapshot).toBeDefined();
			expect(order?.currencySnapshot?.main.totalReceived).toBeDefined();
			expect(order?.currencySnapshot?.priceReference.totalReceived).toBeDefined();
			expect(order?.currencySnapshot?.secondary?.totalReceived).toBeDefined();

			// Issue #2492: order.vat holds only the {rate, country} breakdown — never a monetary
			// amount, and never the internal SAT unit. Amounts live in currencySnapshot.*.vat, in a
			// real (main) currency. Guarded so it also holds for VAT-free orders.
			for (const entry of order?.vat ?? []) {
				expect(entry).not.toHaveProperty('price');
				expect(entry).not.toHaveProperty('partialPrice');
				expect(entry).toMatchObject({ rate: expect.any(Number), country: expect.any(String) });
			}
			for (const amount of order?.currencySnapshot?.main.vat ?? []) {
				expect(amount.currency).not.toBe('SAT');
				expect(amount.currency).toBe(runtimeConfig.mainCurrency);
			}
		});

		it('should increase the invoice number each time', async () => {
			const order1Id = await createOrder(
				[
					{
						product: TEST_DIGITAL_PRODUCT,
						quantity: 1
					}
				],
				'point-of-sale',
				{
					locale: 'en',
					user: {
						sessionId: 'test-session-id'
					},
					shippingAddress: null,
					userVatCountry: 'FR'
				}
			);

			const order2Id = await createOrder(
				[
					{
						product: TEST_DIGITAL_PRODUCT,
						quantity: 1
					}
				],
				'point-of-sale',
				{
					locale: 'en',
					user: {
						sessionId: 'test-session-id'
					},
					shippingAddress: null,
					userVatCountry: 'FR'
				}
			);

			let order1 = await collections.orders.findOne({ _id: order1Id });
			if (!order1) {
				throw new Error('Order 1 not found');
			}

			let order2 = await collections.orders.findOne({ _id: order2Id });
			if (!order2) {
				throw new Error('Order 2 not found');
			}

			expect(order1.payments[0].invoice?.number).toBeUndefined();
			expect(order2.payments[0].invoice?.number).toBeUndefined();

			await onOrderPayment(order2, order2.payments[0], order2.payments[0].price);
			await onOrderPayment(order1, order1.payments[0], order1.payments[0].price);

			order1 = await collections.orders.findOne({ _id: order1Id });
			expect(order1?.payments[0].invoice?.number).toBe(2);
			order2 = await collections.orders.findOne({ _id: order2Id });
			expect(order2?.payments[0].invoice?.number).toBe(1);

			const order3Id = await createOrder(
				[
					{
						product: TEST_DIGITAL_PRODUCT,
						quantity: 1
					}
				],
				'point-of-sale',
				{
					locale: 'en',
					user: {
						sessionId: 'test-session-id'
					},
					shippingAddress: null,
					userVatCountry: 'FR'
				}
			);

			let order3 = await collections.orders.findOne({ _id: order3Id });

			if (!order3) {
				throw new Error('Order 3 not found');
			}

			await onOrderPayment(order3, order3.payments[0], order3.payments[0].price);

			order3 = await collections.orders.findOne({ _id: order3Id });

			expect(order3?.payments[0].invoice?.number).toBe(3);
		});
	});

	it('should show correct last invoice number when multiple payments', async () => {
		const order1Id = await createOrder(
			[
				{
					product: TEST_DIGITAL_PRODUCT,
					quantity: 1,
					depositPercentage: 50
				}
			],
			'point-of-sale',
			{
				locale: 'en',
				user: {
					sessionId: 'test-session-id'
				},
				shippingAddress: null,
				userVatCountry: 'FR'
			}
		);

		const order2Id = await createOrder(
			[
				{
					product: TEST_DIGITAL_PRODUCT,
					quantity: 1
				}
			],
			'point-of-sale',
			{
				locale: 'en',
				user: {
					sessionId: 'test-session-id'
				},
				shippingAddress: null,
				userVatCountry: 'FR'
			}
		);

		let order1 = await collections.orders.findOne({ _id: order1Id });
		if (!order1) {
			throw new Error('Order 1 not found');
		}

		await addOrderPayment(order1, 'point-of-sale', {
			amount: orderAmountWithNoPaymentsCreated(order1),
			currency: order1.currencySnapshot.main.totalPrice.currency
		});

		let order2 = await collections.orders.findOne({ _id: order2Id });
		if (!order2) {
			throw new Error('Order 2 not found');
		}

		expect(order1.payments[0].invoice?.number).toBeUndefined();
		expect(order2.payments[0].invoice?.number).toBeUndefined();

		await onOrderPayment(order1, order1.payments[0], order1.payments[0].price);
		await onOrderPayment(order2, order2.payments[0], order2.payments[0].price);

		order1 = await collections.orders.findOne({ _id: order1Id });
		expect(order1?.payments[0].invoice?.number).toBe(1);
		expect(order1?.payments[0].currencySnapshot.main.previouslyPaid?.amount).toBe(0);
		expect(order1?.currencySnapshot.main.totalPrice.amount).toBe(0.004);
		// 50% of 0.004
		expect(order1?.payments[0].currencySnapshot.main.remainingToPay?.amount).toBe(0.002);
		order2 = await collections.orders.findOne({ _id: order2Id });
		expect(order2?.payments[0].invoice?.number).toBe(2);

		expect(await lastInvoiceNumber()).toBe(2);

		if (!order1) {
			throw new Error('Order 1 not found');
		}

		await onOrderPayment(order1, order1.payments[1], order1.payments[1].price);

		order1 = await collections.orders.findOne({ _id: order1Id });
		expect(await lastInvoiceNumber()).toBe(3);
		expect(order1?.payments[1].invoice?.number).toBe(3);
	});

	it('allows onLocation createOrder without shippingAddress for a shippable product', async () => {
		const orderId = await createOrder(
			[
				{
					product: TEST_PHYSICAL_PRODUCT,
					quantity: 1
				}
			],
			'point-of-sale',
			{
				locale: 'en',
				user: {
					sessionId: 'test-session-id',
					userHasPosOptions: true
				},
				shippingAddress: null,
				onLocation: true,
				userVatCountry: 'FR'
			}
		);

		const order = await collections.orders.findOne({ _id: orderId });
		expect(order).toBeTruthy();
		expect(order?.onLocation).toBe(true);
		expect(order?.shippingAddress).toBeUndefined();
		expect(order?.items[0]?.product.shipping).toBe(true);
	});

	it('still requires shippingAddress for shippable products when not onLocation', async () => {
		await expect(
			createOrder(
				[
					{
						product: TEST_PHYSICAL_PRODUCT,
						quantity: 1
					}
				],
				'point-of-sale',
				{
					locale: 'en',
					user: {
						sessionId: 'test-session-id',
						userHasPosOptions: true
					},
					shippingAddress: null,
					userVatCountry: 'FR'
				}
			)
		).rejects.toMatchObject({ status: 400, body: { message: 'Shipping address is required' } });
	});

	describe('variation pricing', () => {
		function orderPint(customPrice?: { amount: number; currency: 'EUR' }) {
			return createOrder(
				[
					{
						product: TEST_VARIATION_PRODUCT,
						quantity: 1,
						chosenVariations: { Size: 'pint' },
						...(customPrice && { customPrice })
					}
				],
				'point-of-sale',
				{
					locale: 'en',
					user: { sessionId: 'test-session-id', userHasPosOptions: true },
					shippingAddress: null,
					userVatCountry: 'FR'
				}
			);
		}

		/** Test shops do not all count in EUR, so expectations are stated in the main currency. */
		function inMainCurrency(amountEur: number) {
			return toCurrency(runtimeConfig.mainCurrency, amountEur, 'EUR');
		}

		/** The line price every reader computes — invoices, tickets, the API DTOs. */
		async function linePrice(customPrice?: { amount: number; currency: 'EUR' }) {
			const order = await collections.orders.findOne({ _id: await orderPint(customPrice) });
			if (!order) {
				throw new Error('order not found');
			}
			return orderIndividualItemPrice(order.items[0], 'main');
		}

		it('prices an unpriced line from the chosen variations', async () => {
			expect(await linePrice()).toBe(inMainCurrency(150));
		});

		it('keeps the price the caller charged', async () => {
			// The till rang up 120. Recomputing the catalogue's 150 leaves the line above its own
			// order: the total is settled before this point and keeps what the caller charged.
			expect(await linePrice({ amount: 120, currency: 'EUR' })).toBe(inMainCurrency(120));
		});

		it('still refuses variations that do not match the product', async () => {
			await expect(
				createOrder([{ product: TEST_VARIATION_PRODUCT, quantity: 1 }], 'point-of-sale', {
					locale: 'en',
					user: { sessionId: 'test-session-id', userHasPosOptions: true },
					shippingAddress: null,
					userVatCountry: 'FR'
				})
			).rejects.toMatchObject({
				status: 400,
				body: { message: 'error matching on variations choice' }
			});
		});
	});

	describe('isBillingAddressMandatory', () => {
		function counterSale(channel: 'pos-touch' | 'api' | 'web' | undefined) {
			return createOrder([{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }], 'point-of-sale', {
				locale: 'en',
				user: { sessionId: 'test-session-id', userHasPosOptions: true },
				shippingAddress: null,
				userVatCountry: 'FR',
				...(channel && { channel })
			});
		}

		beforeEach(() => {
			runtimeConfig.isBillingAddressMandatory = true;
		});

		afterEach(() => {
			runtimeConfig.isBillingAddressMandatory = false;
		});

		it.each(['pos-touch', 'api'] as const)('does not reach the %s counter', async (channel) => {
			await expect(counterSale(channel)).resolves.toBeTruthy();
		});

		it.each(['web', undefined] as const)('still applies to %s', async (channel) => {
			await expect(counterSale(channel)).rejects.toMatchObject({
				status: 400,
				body: { message: 'Missing billing address for deliveryless order' }
			});
		});
	});

	it('should allow free method payment when only item is fully discounted due to an active subscription', async () => {
		await createPaidSubscription(TEST_SUBSCRIPTION_PRODUCT._id, {
			sessionId: 'test-session-id'
		});
		await createDiscount({
			discountedProductId: TEST_DISCOUNTED_PRODUCT._id,
			subscriptionProductId: TEST_SUBSCRIPTION_PRODUCT._id,
			percentage: 100
		});

		const orderId = await createOrder(
			[
				{
					product: TEST_DISCOUNTED_PRODUCT,
					quantity: 1
				}
			],
			'free',
			{
				locale: 'en',
				user: {
					sessionId: 'test-session-id'
				},
				notifications: {
					paymentStatus: {
						npub: 'test-npub'
					}
				},
				userVatCountry: 'FR',
				shippingAddress: null
			}
		);

		const order = await collections.orders.findOne({ _id: orderId });
		expect(order?.payments[0].method).toBe('free');
		expect(order?.items[0].discountPercentage).toBe(100);
		expect(order?.currencySnapshot.main.totalPrice.amount).toBe(0);
	});
});
