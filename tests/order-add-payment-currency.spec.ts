import { expect, test } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

const E2E_DB = 'bebop-e2e';
const ORDER_ID = 'e2e-order-add-payment-btc';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

test.beforeAll(async () => {
	const createdAt = new Date();
	const price = { amount: 0.0005, currency: 'BTC' };
	await withDb((db) =>
		db.collection('orders').replaceOne(
			{ _id: ORDER_ID as never },
			{
				number: 990002,
				locale: 'en',
				status: 'pending',
				createdAt,
				updatedAt: createdAt,
				user: {},
				notifications: { paymentStatus: {} },
				items: [
					{
						_id: new ObjectId(),
						product: {
							_id: 'e2e-btc-product',
							name: 'E2E bitcoin product',
							alias: [],
							description: '',
							shortDescription: '',
							type: 'resource',
							price,
							shipping: false,
							preorder: false,
							free: false,
							standalone: false,
							payWhatYouWant: false,
							displayShortDescription: false,
							hideDiscountExpiration: false,
							actionSettings: {
								eShop: { visible: true, canBeAddedToBasket: true },
								retail: { visible: true, canBeAddedToBasket: true },
								googleShopping: { visible: true },
								nostr: { visible: true, canBeAddedToBasket: true }
							},
							createdAt,
							updatedAt: createdAt
						},
						quantity: 1,
						vatRate: 0,
						currencySnapshot: { main: { price }, priceReference: { price } }
					}
				],
				payments: [],
				currencySnapshot: {
					main: { totalPrice: price, vat: [] },
					priceReference: { totalPrice: price }
				}
			},
			{ upsert: true }
		)
	);
});

test.afterAll(() => withDb((db) => db.collection('orders').deleteOne({ _id: ORDER_ID as never })));

test('adding a payment to a bitcoin order offers the order currency', async ({ page }) => {
	await page.goto(`/order/${ORDER_ID}`);

	const form = page.locator('form[action$="?/addPayment"]');
	await expect(form.locator('select[name="currency"]')).toHaveValue('BTC');
	const amount = form.locator('input[name="amount"]');
	await expect(amount).toHaveValue('0.0005');
	await expect(amount).toHaveAttribute('step', '0.00000001');
});
