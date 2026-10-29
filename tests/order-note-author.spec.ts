import { expect, test } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const ORDER_ID = 'e2e-order-note-author';

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
	const price = { amount: 10, currency: 'EUR' };
	const note = (role: string, userAlias?: string) => ({
		role,
		userAlias,
		content: `Note from ${userAlias ?? role}`,
		createdAt
	});
	await withDb((db) =>
		db.collection('orders').replaceOne(
			{ _id: ORDER_ID as never },
			{
				number: 990001,
				locale: 'en',
				status: 'paid',
				createdAt,
				updatedAt: createdAt,
				user: {},
				notifications: { paymentStatus: {} },
				items: [
					{
						_id: new ObjectId(),
						product: {
							_id: 'e2e-note-product',
							name: 'E2E product',
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
						vatRate: 20,
						currencySnapshot: { main: { price }, priceReference: { price } }
					}
				],
				payments: [
					{
						_id: new ObjectId(),
						status: 'paid',
						method: 'bank-transfer',
						price,
						currencySnapshot: { main: { price }, priceReference: { price } },
						createdAt,
						paidAt: createdAt,
						clientSecret: 'secret'
					}
				],
				currencySnapshot: {
					main: { totalPrice: price, vat: [{ amount: 1.67, currency: 'EUR' }] },
					priceReference: { totalPrice: price }
				},
				notes: [note('point-of-sale', 'Alice'), note('point-of-sale')]
			},
			{ upsert: true }
		)
	);
});

test.afterAll(async () => {
	await withDb((db) => db.collection('orders').deleteOne({ _id: ORDER_ID as never }));
});

test('an employee note without alias is signed with the role name', async ({ page }) => {
	const roleName = await withDb(
		async (db) => (await db.collection('roles').findOne({ _id: 'point-of-sale' as never }))?.name
	);

	await page.goto(`/order/${ORDER_ID}/notes`);

	await expect(page.getByText('Alice (Employee)')).toBeVisible();
	await expect(page.getByText(`${roleName} (Employee)`)).toBeVisible();
	await expect(page.getByText('{alias}')).toHaveCount(0);
	await expect(page.getByText('undefined (Employee)')).toHaveCount(0);
});
