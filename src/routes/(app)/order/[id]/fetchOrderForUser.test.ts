import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
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

	describe.each([
		{
			processor: 'stripe',
			method: 'card',
			configKey: 'stripe',
			credentials: { secretKey: 'sk_test', publicKey: 'pk_test' }
		},
		{
			processor: 'sumup',
			method: 'card',
			configKey: 'sumUp',
			credentials: { apiKey: 'sup_sk_test', merchantCode: 'MTEST' }
		},
		{
			processor: 'paypal',
			method: 'paypal',
			configKey: 'paypal',
			credentials: { clientId: 'test-client', secret: 'test-secret' }
		}
	] as const)('pending $processor payment', ({ processor, method, configKey, credentials }) => {
		const initialConfig = { ...runtimeConfig[configKey] };

		afterEach(() => {
			Object.assign(runtimeConfig[configKey], initialConfig);
			vi.unstubAllGlobals();
		});

		async function orderAwaitingPayment() {
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
						'payments.0.method': method,
						'payments.0.processor': processor,
						'payments.0.checkoutId': 'CHECKOUT',
						'payments.0.clientSecret': 'CLIENT-SECRET'
					}
				}
			);
			const provider = vi.fn(async () => Response.json({ status: 'succeeded' }));
			vi.stubGlobal('fetch', provider);

			return { orderId, provider };
		}

		// Settling is the payment poller's alone: a page that asked the provider too would
		// slow every view of the order, and fail with it when the provider does not answer.
		it('shows the payment as the poller left it, without asking the provider', async () => {
			Object.assign(runtimeConfig[configKey], credentials);
			const { orderId, provider } = await orderAwaitingPayment();

			const order = await fetchOrderForUser(orderId);

			expect(provider).not.toHaveBeenCalled();
			expect(order.payments[0].status).toBe('pending');
			expect(order.status).toBe('pending');
		});

		// Every page showing the order receives it; only the pay page opens the payment form.
		it('keeps what opens the payment form out of the order', async () => {
			const { orderId } = await orderAwaitingPayment();

			const order = await fetchOrderForUser(orderId);

			expect(JSON.stringify(order)).not.toContain('CLIENT-SECRET');
		});
	});
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
