import { expect, test, type Locator } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const WITH_PICTURE_ID = 'e2e-card-with-picture';
const WITHOUT_PICTURE_ID = 'e2e-card-without-picture';
const PICTURE_ID = 'e2e-card-picture';
const PHONE = { width: 390, height: 844 };

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

function product(_id: string, name: string) {
	return {
		_id,
		name,
		alias: [_id],
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
		// Newest first in the admin list, so both cards are on its first page.
		createdAt: new Date(Date.now() + 60_000),
		updatedAt: new Date()
	};
}

function card(page: import('@playwright/test').Page, name: string): Locator {
	return page.locator('div.flex.flex-col.text-center').filter({ hasText: name });
}

async function box(locator: Locator) {
	const b = await locator.boundingBox();
	if (!b) {
		throw new Error('element is not rendered');
	}
	return b;
}

test.beforeAll(async () => {
	await withDb(async (db) => {
		const products = db.collection('products');
		for (const p of [
			product(WITH_PICTURE_ID, 'E2E card with a picture and a rather long name'),
			product(WITHOUT_PICTURE_ID, 'E2E card without picture')
		]) {
			await products.replaceOne({ _id: p._id as never }, p, { upsert: true });
		}
		// The layout only needs the stored size; the image itself may fail to load.
		await db.collection('pictures').replaceOne(
			{ _id: PICTURE_ID as never },
			{
				_id: PICTURE_ID,
				productId: WITH_PICTURE_ID,
				name: 'E2E card picture',
				storage: {
					original: { key: 'e2e/card.png', width: 512, height: 512, size: 1 },
					formats: [{ key: 'e2e/card-256.png', width: 256, height: 256, size: 1 }]
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
		await db
			.collection('products')
			.deleteMany({ _id: { $in: [WITH_PICTURE_ID, WITHOUT_PICTURE_ID] as never[] } });
		await db.collection('pictures').deleteOne({ _id: PICTURE_ID as never });
	});
});

test.describe('on a phone', () => {
	test.use({ viewport: PHONE });

	test('the shop link sits on the picture corner, whatever the name length', async ({ page }) => {
		await page.goto('/admin/product');

		const withPicture = card(page, 'E2E card with a picture');
		const picture = await box(withPicture.locator('img'));
		const link = await box(withPicture.locator('a[target="_blank"]'));

		expect(link.x + link.width).toBeCloseTo(picture.x + picture.width, 0);
		expect(link.y).toBeCloseTo(picture.y, 0);
	});

	test('without a picture the shop link does not cover the name', async ({ page }) => {
		await page.goto('/admin/product');

		const withoutPicture = card(page, 'E2E card without picture');
		const name = await box(withoutPicture.getByText('E2E card without picture'));
		const link = await box(withoutPicture.locator('a[target="_blank"]'));

		expect(link.y).toBeGreaterThanOrEqual(name.y + name.height);
	});

	test('the product edit page fits the screen width', async ({ page }) => {
		await page.goto(`/admin/product/${WITH_PICTURE_ID}`);
		await expect(page.getByRole('link', { name: 'Duplicate' })).toBeVisible();

		const { scrollWidth, clientWidth } = await page.evaluate(() => ({
			scrollWidth: document.documentElement.scrollWidth,
			clientWidth: document.documentElement.clientWidth
		}));
		expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
	});
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the shop link has a translated name', async ({ page }) => {
		await page.goto('/admin/product');

		await expect(
			card(page, 'E2E card with a picture').getByRole('link', {
				name: 'Ouvrir dans la boutique, dans un nouvel onglet'
			})
		).toBeVisible();
	});
});
