import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

const E2E_DB = 'bebop-e2e';
const PRODUCT_ID = 'e2e-age-wall-product';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

async function setAgeWall(enabled: boolean) {
	await withDb((db) =>
		db
			.collection('runtimeConfig')
			.updateOne(
				{ _id: 'ageRestriction' as never },
				{ $set: { data: { enabled, legalReason: '' }, updatedAt: new Date() } },
				{ upsert: true }
			)
	);
}

test.use({ storageState: { cookies: [], origins: [] } });

test.beforeAll(async () => {
	await withDb(async (db) => {
		await db.collection('products').replaceOne(
			{ _id: PRODUCT_ID as never },
			{
				name: 'E2E age-restricted product',
				alias: [PRODUCT_ID],
				description: 'Seeded by the e2e suite',
				shortDescription: 'Behind the wall',
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
	await setAgeWall(true);
});

test.afterAll(async () => {
	await setAgeWall(false);
	await withDb((db) => db.collection('products').deleteOne({ _id: PRODUCT_ID as never }));
});

test('a visitor who accepts the age wall lands on the page they asked for', async ({ page }) => {
	await expect(async () => {
		await page.goto(`/product/${PRODUCT_ID}`);
		await expect(page.getByText('I have read the access conditions')).toBeVisible({
			timeout: 1000
		});
	}).toPass();
	await expect(page.getByRole('heading', { name: 'E2E age-restricted product' })).toHaveCount(0);

	await page.getByRole('checkbox').check();
	await page.getByRole('button', { name: 'Continue browsing' }).click();

	await expect(page).toHaveURL(new RegExp(`/product/${PRODUCT_ID}$`));
	await expect(page.getByRole('heading', { name: 'E2E age-restricted product' })).toBeVisible();
});

test('accepting the age wall never leaves the shop', async ({ request }) => {
	// A plain form post, as the browser sends it, so the action answers with a real redirect.
	const navigate = (redirectTo: string) =>
		request.post('/?/navigate', {
			form: { redirectTo },
			headers: { origin: 'http://localhost:5012', accept: 'text/html' },
			maxRedirects: 0
		});

	for (const redirectTo of ['/\t/example.com', '//example.com', '/\\example.com', '/admin']) {
		expect((await navigate(redirectTo)).headers()['location'], redirectTo).toBe('/');
	}
	expect((await navigate(`/product/${PRODUCT_ID}`)).headers()['location']).toBe(
		`/product/${PRODUCT_ID}`
	);
});
