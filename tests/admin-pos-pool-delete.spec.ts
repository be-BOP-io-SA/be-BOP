import { expect, test, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
// The e2e shop runs on the default pools; "Terrasse" holds "Sunny" (slug terrasse-0) and a second pool.
const NON_EMPTY_SLUG = 'terrasse-0';

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
		await db.collection('orderTabs').deleteMany({ slug: NON_EMPTY_SLUG });
		await db.collection('orderTabs').insertOne({
			_id: new ObjectId(),
			slug: NON_EMPTY_SLUG,
			items: [{ _id: new ObjectId(), productId: 'e2e-anything', quantity: 2 }],
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});
});

test.afterAll(async () => {
	await withDb((db) => db.collection('orderTabs').deleteMany({ slug: NON_EMPTY_SLUG }));
});

async function deleteTerrasseGroup(page: Page) {
	await page.goto('/admin/pos', { waitUntil: 'networkidle' });
	const groupNames = page.getByPlaceholder('Group Name');
	await expect(groupNames).toHaveCount(2);
	await expect(groupNames.nth(1)).toHaveValue('Terrasse');
	await page.getByRole('button', { name: 'Delete Group' }).nth(1).click();
	await expect(groupNames).toHaveCount(1);
	await page.locator('input[type="submit"][value="Update"]').click();
	await page.waitForLoadState('networkidle');
}

test('removing a group whose pool holds items is refused, and nothing is saved', async ({
	page
}) => {
	await deleteTerrasseGroup(page);

	await expect(page.getByRole('alert')).toContainText(
		'these pools still hold items and cannot be removed or renamed: Sunny'
	);
	await page.goto('/admin/pos');
	await expect(page.getByPlaceholder('Group Name').nth(1)).toHaveValue('Terrasse');
	expect(
		await withDb((db) => db.collection('orderTabs').countDocuments({ slug: NON_EMPTY_SLUG }))
	).toBe(1);
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the refusal is translated', async ({ page }) => {
		await deleteTerrasseGroup(page);

		await expect(page.getByRole('alert')).toContainText(
			'ces pools contiennent encore des articles'
		);
	});
});
