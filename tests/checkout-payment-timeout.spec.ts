import { expect, test } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const PRODUCT_ID = 'e2e-checkout-timeout';
const METHOD = { id: 'e2e-voucher', label: 'E2E voucher', instructions: '' };
const OUT_OF_RANGE = 'The payment timeout must be at least 1 minute.';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

let previousCustomMethods: unknown;
let adminId: ObjectId;

const ordersOfAdmin = () =>
	withDb((db) => db.collection('orders').countDocuments({ 'user.userId': adminId }));

test.beforeAll(async () => {
	await withDb(async (db) => {
		// Only a till account is offered the payment timeout.
		await db
			.collection('users')
			.updateOne({ login: 'e2e-admin' }, { $set: { hasPosOptions: true } });
		const admin = await db.collection('users').findOne({ login: 'e2e-admin' });
		adminId = admin?._id as ObjectId;
		// The till hides the timeout for its own point-of-sale method, so another method is needed.
		previousCustomMethods = (
			await db.collection('runtimeConfig').findOne({ _id: 'customPaymentMethods' as never })
		)?.data;
		await db
			.collection('runtimeConfig')
			.updateOne(
				{ _id: 'customPaymentMethods' as never },
				{ $set: { data: [METHOD], updatedAt: new Date() } },
				{ upsert: true }
			);
		await db.collection('products').replaceOne(
			{ _id: PRODUCT_ID as never },
			{
				name: 'E2E checkout timeout',
				alias: [PRODUCT_ID],
				description: '',
				shortDescription: '',
				type: 'resource',
				price: { amount: 10, currency: 'EUR' },
				shipping: false,
				preorder: false,
				free: false,
				standalone: false,
				isTicket: false,
				displayShortDescription: false,
				payWhatYouWant: false,
				hideDiscountExpiration: false,
				actionSettings: {
					eShop: { visible: true, canBeAddedToBasket: true },
					retail: { visible: true, canBeAddedToBasket: true },
					googleShopping: { visible: true },
					nostr: { visible: true, canBeAddedToBasket: true }
				},
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
		await db.collection('carts').deleteMany({ 'user.userId': adminId });
		await db.collection('carts').insertOne({
			_id: new ObjectId(),
			user: { userId: adminId },
			items: [{ productId: PRODUCT_ID, quantity: 1 }],
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		await db.collection('carts').deleteMany({ 'user.userId': adminId });
		await db
			.collection('users')
			.updateOne({ login: 'e2e-admin' }, { $unset: { hasPosOptions: '' } });
		await db
			.collection('runtimeConfig')
			.updateOne(
				{ _id: 'customPaymentMethods' as never },
				{ $set: { data: previousCustomMethods ?? [], updatedAt: new Date() } }
			);
		await db.collection('products').deleteOne({ _id: PRODUCT_ID as never });
	});
});

test('the server answers an out-of-range timeout with the checkout page', async ({ page }) => {
	const ordersBefore = await ordersOfAdmin();
	const response = await page.request.post('/checkout', {
		form: {
			paymentMethod: `custom:${METHOD.id}`,
			teecees: 'on',
			paymentTimeOut: '0'
		},
		headers: { origin: 'http://localhost:5012', accept: 'text/html' }
	});

	expect(response.status()).toBe(400);
	expect(await response.text()).toContain(OUT_OF_RANGE);
	expect(await ordersOfAdmin()).toBe(ordersBefore);
});

test('the till accepts a payment timeout of any length', async ({ page }) => {
	try {
		const ordersBefore = await ordersOfAdmin();
		await page.goto('/checkout');
		const response = await page.request.post('/checkout', {
			form: { paymentMethod: `custom:${METHOD.id}`, teecees: 'on', paymentTimeOut: '50000' },
			headers: { origin: 'http://localhost:5012', accept: 'text/html' },
			maxRedirects: 0
		});
		expect(response.status()).toBe(303);
		expect(await ordersOfAdmin()).toBe(ordersBefore + 1);
	} finally {
		await withDb((db) => db.collection('orders').deleteMany({ 'items.product._id': PRODUCT_ID }));
	}
});
