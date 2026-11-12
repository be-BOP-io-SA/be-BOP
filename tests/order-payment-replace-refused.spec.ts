import { expect, test } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const PRODUCT_ID = 'e2e-order-payment-replace-refused';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

let adminId: ObjectId;

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
				name: 'E2E order payment replace refused',
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
		await db.collection('orders').deleteMany({ 'items.product._id': PRODUCT_ID });
		await db
			.collection('users')
			.updateOne({ login: 'e2e-admin' }, { $unset: { hasPosOptions: '' } });
		await db.collection('products').deleteOne({ _id: PRODUCT_ID as never });
	});
});

test('shows why a payment method swap is refused', async ({ page }) => {
	await page.goto('/checkout');
	const cartId = await page.locator('input[name="cartId"]').inputValue();
	const placed = await page.request.post('/checkout', {
		form: { paymentMethod: 'point-of-sale', teecees: 'on', cartId },
		headers: { origin: 'http://localhost:5012', accept: 'text/html' },
		maxRedirects: 0
	});
	const orderUrl = placed.headers()['location'];
	expect(orderUrl).toMatch(/^\/order\/[^/?]+$/);

	// The refusal itself is covered by the action's own test: here only the page's answer to it.
	await page.route('**/payment/*?/replaceMethod', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				type: 'failure',
				status: 400,
				data: JSON.stringify([{ discountTiedToPaymentMethod: 1 }, true])
			})
		})
	);

	await page.goto(orderUrl);
	const submit = page.getByRole('button', { name: /^(Change|Resend payment method)$/ });
	// The toggle only works once the page is hydrated.
	await expect(async () => {
		await page
			.getByRole('button', { name: /^(Change ▾|Replace payment method)$/ })
			.first()
			.click({ timeout: 1000 });
		await expect(submit).toBeVisible({ timeout: 1000 });
	}).toPass({ timeout: 20_000 });
	await submit.click();

	await expect(
		page.getByText('This order was discounted for its current payment method.')
	).toBeVisible();
});
