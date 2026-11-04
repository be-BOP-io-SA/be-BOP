import { expect, test, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const PRODUCT_ID = 'e2e-checkout-double-submit';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

let adminId: ObjectId;

async function fillCart() {
	const _id = new ObjectId();
	await withDb(async (db) => {
		await db.collection('carts').deleteMany({ 'user.userId': adminId });
		await db.collection('carts').insertOne({
			_id,
			user: { userId: adminId },
			items: [{ productId: PRODUCT_ID, quantity: 1 }],
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});
	return _id.toString();
}

const ordersOfProduct = () =>
	withDb((db) => db.collection('orders').countDocuments({ 'items.product._id': PRODUCT_ID }));

/** Posts the checkout form the way the browser does, without following the redirect. */
async function pay(page: Page, cartId: string) {
	const response = await page.request.post('/checkout', {
		form: { paymentMethod: 'point-of-sale', teecees: 'on', cartId },
		headers: { origin: 'http://localhost:5012', accept: 'text/html' },
		maxRedirects: 0
	});
	return { status: response.status(), location: response.headers()['location'] };
}

const cartIdOnCheckoutPage = (page: Page) =>
	page.locator('input[name="cartId"]').inputValue({ timeout: 5000 });

test.beforeAll(async () => {
	await withDb(async (db) => {
		// The till's own payment method needs no processor to be configured.
		await db
			.collection('users')
			.updateOne({ login: 'e2e-admin' }, { $set: { hasPosOptions: true } });
		adminId = (await db.collection('users').findOne({ login: 'e2e-admin' }))?._id as ObjectId;
		await db.collection('products').replaceOne(
			{ _id: PRODUCT_ID as never },
			{
				name: 'E2E checkout double submit',
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
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		await db.collection('carts').deleteMany({ 'user.userId': adminId });
		await db.collection('orders').deleteMany({ 'items.product._id': PRODUCT_ID });
		await db
			.collection('users')
			.updateOne({ login: 'e2e-admin' }, { $unset: { hasPosOptions: '' } });
		await db.collection('products').deleteOne({ _id: PRODUCT_ID as never });
	});
});

// One test, three posts: the shop allows 30 posts a minute per address and the suite runs close to it.
test('payments of one cart, at once or late, all land on the one order placed', async ({
	page
}) => {
	const cartId = await fillCart();
	await page.goto('/checkout');
	const ordersBefore = await ordersOfProduct();

	const [first, racing] = await Promise.all([pay(page, cartId), pay(page, cartId)]);
	const late = await pay(page, cartId);

	expect(first.status).toBe(303);
	expect(first.location).toMatch(/^\/order\/[^/?]+$/);
	expect(racing).toEqual(first);
	expect(late).toEqual(first);
	expect(await ordersOfProduct()).toBe(ordersBefore + 1);
	expect(await cartIdOnCheckoutPage(page)).toBe(cartId);
});
