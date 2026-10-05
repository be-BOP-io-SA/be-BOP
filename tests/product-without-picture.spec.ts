import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const PRODUCT_ID = 'e2e-product-without-picture';

// The admin form requires an image upload (and S3), so a picture-less product can only be seeded.
async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

test.beforeAll(async () => {
	await withDb(async (db) => {
		await db.collection('pictures').deleteMany({ productId: PRODUCT_ID });
		await db.collection('products').replaceOne(
			{ _id: PRODUCT_ID as never },
			{
				name: 'E2E product without picture',
				alias: [PRODUCT_ID],
				description: 'Seeded by the e2e suite',
				shortDescription: 'No picture',
				type: 'resource',
				price: { amount: 10, currency: 'EUR' },
				shipping: false,
				preorder: false,
				free: false,
				standalone: false,
				isTicket: false,
				displayShortDescription: true,
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
	await withDb((db) => db.collection('products').deleteOne({ _id: PRODUCT_ID as never }));
});

test('a product without any picture still has a working page', async ({ page }) => {
	const response = await page.goto(`/product/${PRODUCT_ID}`);

	expect(response?.status()).toBe(200);
	await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_ID}$`));
	await expect(page.getByRole('heading', { name: 'E2E product without picture' })).toBeVisible();

	const jsonLd = JSON.parse(
		(await page.locator('script[type="application/ld+json"]').first().textContent()) ?? '{}'
	);
	expect(jsonLd).toMatchObject({ '@type': 'Product', name: 'E2E product without picture' });
	expect(jsonLd).not.toHaveProperty('image');
});
