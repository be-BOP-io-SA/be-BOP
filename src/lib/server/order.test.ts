import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from './test-utils';
import { collections } from './database';
import { TEST_PRODUCT, TEST_PRODUCT_UNLIMITED } from './seed/product';
import { createOrder, onOrderPaid } from './orders';
import { resetConfig, runtimeConfig } from './runtime-config';

describe('order', () => {
	beforeEach(async () => {
		await cleanDb();
		resetConfig();
		await collections.products.insertMany([TEST_PRODUCT, TEST_PRODUCT_UNLIMITED]);
	});

	describe('onOrderPaid', () => {
		it('should increase the invoice number each time, even if an order disappears', async () => {
			expect(runtimeConfig.invoiceNumber).toBe(0);

			const order1Id = await createOrder(
				[
					{
						product: TEST_PRODUCT,
						quantity: 1
					}
				],
				'cash',
				{
					user: {
						sessionId: 'test-session-id'
					},
					shippingAddress: null,
					vatCountry: 'FR'
				}
			);

			const order2Id = await createOrder(
				[
					{
						product: TEST_PRODUCT,
						quantity: 1
					}
				],
				'cash',
				{
					user: {
						sessionId: 'test-session-id'
					},
					shippingAddress: null,
					vatCountry: 'FR'
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

			expect(runtimeConfig.invoiceNumber).toBe(0);

			await onOrderPaid(order2, undefined);
			await onOrderPaid(order1, undefined);

			order1 = await collections.orders.findOne({ _id: order1Id });
			expect(order1?.number).toBe(2);
			order2 = await collections.orders.findOne({ _id: order2Id });
			expect(order2?.number).toBe(1);

			await collections.orders.deleteMany({});

			const order3Id = await createOrder(
				[
					{
						product: TEST_PRODUCT,
						quantity: 1
					}
				],
				'cash',
				{
					user: {
						sessionId: 'test-session-id'
					},
					shippingAddress: null,
					vatCountry: 'FR'
				}
			);

			let order3 = await collections.orders.findOne({ _id: order3Id });

			if (!order3) {
				throw new Error('Order 3 not found');
			}

			await onOrderPaid(order3, undefined);

			order3 = await collections.orders.findOne({ _id: order3Id });

			expect(order3?.number).toBe(3);

			expect(runtimeConfig.invoiceNumber).toBe(3);
		});
	});
});
