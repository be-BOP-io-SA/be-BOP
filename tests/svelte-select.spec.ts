import { expect, test, type Locator, type Page } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const TAG_ID = 'e2e-select-tag';
const CMS_SLUG = 'e2e-select-calculator';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

/** Searches the list, picks the option and checks the field shows it once the list closes */
async function choose(select: Locator, search: string, option: string) {
	const input = select.locator('input').first();
	// Before hydration the field is plain markup that ignores the click, so retry until it opens.
	await expect(async () => {
		await input.click();
		await expect(select.locator('.svelte-select-list')).toBeVisible({ timeout: 1000 });
	}).toPass();
	await input.fill(search);
	await expect(select.locator('.svelte-select-list .item').first()).toHaveText(option);
	// The keyboard, because the sticky save bar of admin forms can cover the open list.
	await input.press('Enter');
	await expect(select.locator('.svelte-select-list')).toHaveCount(0);
	await expect(select.locator('.selected-item')).toHaveText(option);
}

/** The select whose choice is posted through the hidden input of that name */
function selectFor(page: Page, hiddenName: string) {
	return page
		.locator('label', { has: page.locator(`input[type=hidden][name="${hiddenName}"]`) })
		.locator('.svelte-select');
}

function hidden(page: Page, name: string) {
	return page.locator(`input[type=hidden][name="${name}"]`);
}

let savedThresholds: { _id: string; data: unknown } | null = null;

test.beforeAll(async () => {
	await withDb(async (db) => {
		savedThresholds = await db
			.collection<{ _id: string; data: unknown }>('runtimeConfig')
			.findOne({ _id: 'confirmationBlocksThresholds' });
		await db.collection('tags').replaceOne(
			{ _id: TAG_ID as never },
			{
				name: 'E2E select tag',
				family: 'creators',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
		await db.collection('cmsPages').replaceOne(
			{ _id: CMS_SLUG as never },
			{
				title: 'E2E currency calculator',
				shortDescription: '',
				content: '<p>Convert</p>[CurrencyCalculator=e2e]',
				fullScreen: false,
				maintenanceDisplay: false,
				hasMobileContent: false,
				hasEmployeeContent: false,
				displayRawContent: false,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		const config = db.collection<{ _id: string; data: unknown }>('runtimeConfig');
		if (savedThresholds) {
			await config.replaceOne({ _id: 'confirmationBlocksThresholds' }, savedThresholds);
		} else {
			await config.deleteOne({ _id: 'confirmationBlocksThresholds' });
		}
		await db.collection('tags').deleteOne({ _id: TAG_ID as never });
		await db.collection('cmsPages').deleteOne({ _id: CMS_SLUG as never });
	});
});

test('product price currency', async ({ page }) => {
	await page.goto('/admin/product/new');
	await choose(selectFor(page, 'priceCurrency'), 'CHF', 'CHF');
	await expect(hidden(page, 'priceCurrency')).toHaveValue('CHF');
});

test('product list tag filter', async ({ page }) => {
	await page.goto('/admin/product');
	await choose(selectFor(page, 'tagId'), 'E2E select', 'E2E select tag');
	await expect(hidden(page, 'tagId')).toHaveValue(TAG_ID);
});

test('shop main currency', async ({ page }) => {
	await page.goto('/admin/config');
	await choose(selectFor(page, 'mainCurrency'), 'JPY', 'JPY');
	await expect(hidden(page, 'mainCurrency')).toHaveValue('JPY');
});

test('payment processor currency', async ({ page }) => {
	await page.goto('/admin/stripe');
	await choose(selectFor(page, 'currency'), 'CHF', 'CHF');
	await expect(hidden(page, 'currency')).toHaveValue('CHF');
});

test('schedule timezone', async ({ page }) => {
	await page.goto('/admin/schedule/new');
	const timezone = page.getByLabel('Set GMT timezone instead of server timezone');
	// The only select of the page, and the one not wrapped in a label.
	const select = page.locator('main .svelte-select');
	// The checkbox only reveals the field once the page is interactive.
	await expect(async () => {
		await timezone.check();
		await expect(select).toBeVisible({ timeout: 1000 });
	}).toPass();
	await choose(select, 'Asia/Tok', 'Asia/Tokyo');
	await expect(hidden(page, 'timezone')).toHaveValue('Asia/Tokyo');
});

test('currency calculator widget', async ({ page }) => {
	await page.goto(`/${CMS_SLUG}`);
	await choose(page.locator('.currency-calculator .svelte-select').first(), 'JPY', 'JPY');
});

test('the chosen currency is saved', async ({ page }) => {
	await page.goto('/admin/config/confirmation-threshold');
	await choose(selectFor(page, 'currency'), 'CHF', 'CHF');
	await page.getByRole('button', { name: 'Save' }).click();
	await page.waitForLoadState('load');

	await page.goto('/admin/config/confirmation-threshold');
	await expect(hidden(page, 'currency')).toHaveValue('CHF');
	await expect(selectFor(page, 'currency').locator('.selected-item')).toHaveText('CHF');
});
