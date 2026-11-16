import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';

// What a stranger sees: no session needed, and none should be.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * A URL that matches nothing renders the shop's own `error` CMS page, the one an operator
 * customises, and answers 200 as main does.
 */

async function errorPageTitle(): Promise<string> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		const page = await client
			.db(E2E_DB)
			.collection('cmsPages')
			.findOne({ _id: 'error' as never }, { projection: { title: 1 } });
		if (!page) {
			throw new Error('The e2e shop has no error page: the admin layout seeds it on sign-in.');
		}
		return page.title;
	} finally {
		await client.close();
	}
}

test("an unknown page shows the shop's error page", async ({ page }) => {
	const response = await page.goto('/this-page-does-not-exist');

	expect(response?.status()).toBe(200);
	await expect(page).toHaveTitle(await errorPageTitle());
});

test("an unknown nested path shows the shop's error page too", async ({ page }) => {
	// Deeper URLs are served by a different route from single-segment ones, and each has its
	// own fallback to the error page.
	const response = await page.goto('/no/such/place');

	expect(response?.status()).toBe(200);
	await expect(page).toHaveTitle(await errorPageTitle());
});

test("a link to an unknown page shows the shop's error page", async ({ page }) => {
	// Hydrated, the router takes over the link: a client-side navigation loads the page data
	// separately from the document.
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.evaluate(() => {
		const link = document.createElement('a');
		link.href = '/this-page-does-not-exist';
		link.textContent = 'unknown';
		document.body.append(link);
	});
	await page.getByRole('link', { name: 'unknown', exact: true }).click();

	await expect(page).toHaveURL(/\/this-page-does-not-exist$/);
	await expect(page).toHaveTitle(await errorPageTitle());
});

test('a real page still answers 200', async ({ page }) => {
	const response = await page.goto('/');

	expect(response?.status()).toBe(200);
});
