import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb, createDiscount, createPaidSubscription } from './test-utils';
import { collections } from './database';
import {
	TEST_DIGITAL_PRODUCT,
	TEST_DIGITAL_PRODUCT_UNLIMITED,
	TEST_DISCOUNTED_PRODUCT,
	TEST_SUBSCRIPTION_PRODUCT
} from './seed/product';
import { addOrderPayment, createOrder, lastInvoiceNumber, onOrderPayment } from './orders';
import { orderAmountWithNoPaymentsCreated } from '$lib/types/Order';
import { runtimeConfig } from './runtime-config';

describe('order', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.products.insertMany([
			TEST_DIGITAL_PRODUCT,
			TEST_DIGITAL_PRODUCT_UNLIMITED,
			TEST_SUBSCRIPTION_PRODUCT,
			TEST_DISCOUNTED_PRODUCT
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

	it('gives every concurrent settlement its own invoice number', async () => {
		// #2743: invoice numbers were derived by reading back the highest one already stored, so
		// settlements landing together computed the same next number. The unique index let one
		// through and the rest lost their payment, leaving those orders pending at zero.
		const orderIds = await Promise.all(
			Array.from({ length: 8 }, (_, i) =>
				createOrder([{ product: TEST_DIGITAL_PRODUCT, quantity: 1 }], 'point-of-sale', {
					locale: 'en',
					user: { sessionId: `concurrent-session-${i}` },
					shippingAddress: null,
					userVatCountry: 'FR'
				})
			)
		);

		const orders = await Promise.all(
			orderIds.map(async (id) => {
				const order = await collections.orders.findOne({ _id: id });
				if (!order) {
					throw new Error(`Order ${id} not found`);
				}
				return order;
			})
		);

		await Promise.all(
			orders.map((order) => onOrderPayment(order, order.payments[0], order.payments[0].price))
		);

		const settled = await collections.orders.find({ _id: { $in: orderIds } }).toArray();
		const invoiceNumbers = settled.map((order) => order.payments[0].invoice?.number);

		expect(invoiceNumbers.every((number) => typeof number === 'number')).toBe(true);
		expect(new Set(invoiceNumbers).size).toBe(orderIds.length);
		expect(settled.every((order) => order.payments[0].status === 'paid')).toBe(true);
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
