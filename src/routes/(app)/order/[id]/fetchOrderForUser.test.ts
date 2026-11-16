import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import { createOrder } from '$lib/server/orders';
import { runtimeConfig } from '$lib/server/runtime-config';
import { FAKE_ORDER_INVOICE_NUMBER } from '$lib/types/Order';
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

	describe('staff-only order data', () => {
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
				{
					$set: {
						orderLabelIds: ['label-1'],
						'user.userLogin': 'seller-login',
						'user.userAlias': 'Seller',
						'user.userRoleId': POS_ROLE_ID,
						notes: [
							{
								role: POS_ROLE_ID,
								userAlias: 'Seller',
								content: 'internal-note',
								createdAt: new Date()
							}
						]
					}
				}
			);
			return orderId;
		}

		it('hides notes and the seller identity from an anonymous viewer', async () => {
			const order = await fetchOrderForUser(await labelledOrderId());

			expect(order.notes).toEqual([]);
			expect(JSON.stringify(order)).not.toContain('internal-note');
			expect(JSON.stringify(order)).not.toContain('seller-login');
			expect(order.user).not.toHaveProperty('userLogin');
			expect(order.user).not.toHaveProperty('userAlias');
			expect(order.user).not.toHaveProperty('userRoleId');
		});

		it('hides notes and the seller identity from a customer', async () => {
			const order = await fetchOrderForUser(await labelledOrderId(), {
				userRoleId: CUSTOMER_ROLE_ID
			});

			expect(order.notes).toEqual([]);
			expect(JSON.stringify(order)).not.toContain('seller-login');
		});

		it('shows notes and the seller identity to staff', async () => {
			const order = await fetchOrderForUser(await labelledOrderId(), {
				userRoleId: POS_ROLE_ID
			});

			expect(order.notes.map((note) => note.content)).toEqual(['internal-note']);
			expect(order.user.userLogin).toBe('seller-login');
			expect(order.user.userAlias).toBe('Seller');
		});

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

		async function orderWithPaypalCapture(
			captureStatus: string,
			checkoutStatus: 'COMPLETED' | 'APPROVED' = 'COMPLETED'
		) {
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
							: url.endsWith('/capture') || checkoutStatus === 'COMPLETED'
							? {
									id: 'PAYPAL-CHECKOUT',
									// PayPal reports the checkout COMPLETED whatever state its capture is in.
									status: 'COMPLETED',
									purchase_units: [
										{ amount, payments: { captures: [{ status: captureStatus, amount }] } }
									]
							  }
							: { id: 'PAYPAL-CHECKOUT', status: checkoutStatus, purchase_units: [{ amount }] },
						{ status: url.endsWith('/capture') ? 201 : 200 }
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

		it('shows the payment pending when the capture made on return comes back PENDING', async () => {
			const orderId = await orderWithPaypalCapture('PENDING', 'APPROVED');

			const order = await fetchOrderForUser(orderId);

			expect(order.payments[0].status).toBe('pending');
			expect(order.status).toBe('pending');
		});

		it('reports the order paid when the capture made on return is COMPLETED', async () => {
			const orderId = await orderWithPaypalCapture('COMPLETED', 'APPROVED');

			const order = await fetchOrderForUser(orderId);

			expect(order.payments[0].status).toBe('paid');
		});

		it('reports the order paid once the capture is COMPLETED', async () => {
			const orderId = await orderWithPaypalCapture('COMPLETED');

			const order = await fetchOrderForUser(orderId);

			expect(order.payments[0].status).toBe('paid');
			expect(order.status).toBe('paid');
		});
	});

	describe.each([
		{
			processor: 'stripe',
			configKey: 'stripe',
			credentials: { secretKey: 'sk_test', publicKey: 'pk_test' },
			statusUrl: 'https://api.stripe.com/v1/payment_intents/CHECKOUT',
			paid: 'succeeded',
			unpaid: 'requires_payment_method'
		},
		{
			processor: 'sumup',
			configKey: 'sumUp',
			credentials: { apiKey: 'sup_sk_test', merchantCode: 'MTEST' },
			statusUrl: 'https://api.sumup.com/v0.1/checkouts/CHECKOUT',
			paid: 'PAID',
			unpaid: 'PENDING'
		}
	] as const)(
		'pending $processor payment',
		({ processor, configKey, credentials, statusUrl, paid, unpaid }) => {
			const initialConfig = { ...runtimeConfig[configKey] };

			afterEach(() => {
				Object.assign(runtimeConfig[configKey], initialConfig);
				vi.unstubAllGlobals();
			});

			async function orderAwaitingCard(providerStatus: string) {
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
							'payments.0.method': 'card',
							'payments.0.processor': processor,
							'payments.0.checkoutId': 'CHECKOUT',
							'payments.0.clientSecret': 'CLIENT-SECRET'
						}
					}
				);
				const provider = vi.fn(async () => Response.json({ status: providerStatus }));
				vi.stubGlobal('fetch', provider);

				return { orderId, provider };
			}

			it('reports the order paid as soon as the provider holds the money', async () => {
				Object.assign(runtimeConfig[configKey], credentials);
				const { orderId, provider } = await orderAwaitingCard(paid);

				const order = await fetchOrderForUser(orderId);

				expect(provider).toHaveBeenCalledWith(statusUrl, expect.anything());
				expect(order.payments[0].status).toBe('paid');
				expect(order.payments[0].invoice?.number).toBe(FAKE_ORDER_INVOICE_NUMBER);
				expect(order.status).toBe('paid');
			});

			it('leaves settling the stored order to the payment poller', async () => {
				Object.assign(runtimeConfig[configKey], credentials);
				const { orderId } = await orderAwaitingCard(paid);

				await fetchOrderForUser(orderId);

				const stored = await collections.orders.findOne({ _id: orderId });
				expect(stored?.status).toBe('pending');
				expect(stored?.payments[0].status).toBe('pending');
			});

			it('keeps the order pending while the provider still waits for the card', async () => {
				Object.assign(runtimeConfig[configKey], credentials);
				const { orderId } = await orderAwaitingCard(unpaid);

				const order = await fetchOrderForUser(orderId);

				expect(order.payments[0].status).toBe('pending');
				expect(order.status).toBe('pending');
			});

			it('does not ask a provider the shop has no credentials for', async () => {
				const { orderId, provider } = await orderAwaitingCard(paid);

				const order = await fetchOrderForUser(orderId);

				expect(provider).not.toHaveBeenCalled();
				expect(order.payments[0].status).toBe('pending');
			});

			// Every page showing the order receives it; only the pay page opens the payment form.
			it('keeps what opens the payment form out of the order', async () => {
				const { orderId } = await orderAwaitingCard(unpaid);

				const order = await fetchOrderForUser(orderId);

				expect(JSON.stringify(order)).not.toContain('CLIENT-SECRET');
			});
		}
	);
});

function note(role: string | null, userAlias?: string) {
	return { role, userAlias, content: `by ${role}`, createdAt: new Date() };
}

describe('fetchOrderForUser notes', () => {
	beforeEach(async () => {
		await cleanDb();
		// Built-in roles are reseeded in the background after cleanDb, so the role may not exist yet.
		await collections.roles.updateOne(
			{ _id: POS_ROLE_ID },
			{ $set: { name: 'Point of sale' } },
			{ upsert: true }
		);
	});

	it('names an employee by alias, else by role name, else by role id', async () => {
		const order = await insertTestOrder({
			notes: [
				note(POS_ROLE_ID, 'Alice'),
				note(POS_ROLE_ID),
				note('removed-role'),
				note(CUSTOMER_ROLE_ID),
				note(null)
			]
		});

		const { notes } = await fetchOrderForUser(order._id, { userRoleId: POS_ROLE_ID });

		expect(
			notes.map(({ alias, isEmployee, isSystem }) => ({ alias, isEmployee, isSystem }))
		).toEqual([
			{ alias: 'Alice', isEmployee: true, isSystem: false },
			{ alias: 'Point of sale', isEmployee: true, isSystem: false },
			{ alias: 'removed-role', isEmployee: true, isSystem: false },
			{ alias: undefined, isEmployee: false, isSystem: false },
			{ alias: undefined, isEmployee: true, isSystem: true }
		]);
	});
});
