import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

const E2E_DB = 'bebop-e2e';
const PRODUCT_ID = 'e2e-age-wall-product';
const SCHEDULE_ID = 'e2e-age-wall-schedule';

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
		await db.collection('schedules').replaceOne(
			{ _id: SCHEDULE_ID as never },
			{
				name: 'E2E age wall schedule',
				pastEventDelay: 60,
				displayPastEvents: true,
				displayPastEventsAfterFuture: false,
				sortByEventDateDesc: false,
				events: [],
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
	await withDb(async (db) => {
		await db.collection('products').deleteOne({ _id: PRODUCT_ID as never });
		await db.collection('schedules').deleteOne({ _id: SCHEDULE_ID as never });
	});
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

test('the age wall leaves feeds and endpoints reachable without a cookie', async ({ request }) => {
	await expect(async () => {
		const wall = await request.get(`/product/${PRODUCT_ID}`, { maxRedirects: 0 });
		expect(wall.status()).toBe(303);
	}).toPass();

	const rss = await request.get(`/schedule/${SCHEDULE_ID}/rss.xml`, { maxRedirects: 0 });
	expect(rss.status()).toBe(200);
	expect(await rss.text()).toContain('<title>E2E age wall schedule</title>');

	const api = await request.get(`/api/product/${PRODUCT_ID}`, { maxRedirects: 0 });
	expect(api.status()).toBe(200);
});
