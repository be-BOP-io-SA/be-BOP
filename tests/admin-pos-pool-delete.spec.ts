import { expect, test, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
// The e2e shop runs on the default pools: "Tables" (5 pools) and "Terrasse" ("Sunny", then a second
// pool). "Sunny" has the slug terrasse-0.
const NON_EMPTY_SLUG = 'terrasse-0';
const REFUSAL =
	'These pools still hold items and cannot be removed or renamed: Sunny. Pay or empty them first.';

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

// A native dialog blocks the click that opened it until it is answered.
function recordDialogs(page: Page): string[] {
	const messages: string[] = [];
	page.on('dialog', async (dialog) => {
		messages.push(dialog.message());
		await dialog.accept();
	});
	return messages;
}

async function openPools(page: Page) {
	await page.goto('/admin/pos', { waitUntil: 'networkidle' });
	const groupNames = page.getByPlaceholder('Group Name');
	await expect(groupNames).toHaveCount(2);
	await expect(groupNames.nth(1)).toHaveValue('Terrasse');
	return groupNames;
}

const deleteButtons = (page: Page) => page.getByRole('button', { name: 'Delete', exact: true });

test('deleting a group whose pool holds items is refused right away', async ({ page }) => {
	const dialogs = recordDialogs(page);
	const groupNames = await openPools(page);

	await page.getByRole('button', { name: 'Delete Group' }).nth(1).click();

	expect(dialogs).toEqual([REFUSAL]);
	await expect(groupNames).toHaveCount(2);
});

test('deleting the pool row that holds items is refused right away', async ({ page }) => {
	const dialogs = recordDialogs(page);
	await openPools(page);
	// 5 "Tables" rows come first, then "Sunny".
	await expect(deleteButtons(page)).toHaveCount(7);

	await deleteButtons(page).nth(5).click();

	expect(dialogs).toEqual([REFUSAL]);
	await expect(deleteButtons(page)).toHaveCount(7);
});

test('an empty pool can still be deleted', async ({ page }) => {
	const dialogs = recordDialogs(page);
	await openPools(page);

	await deleteButtons(page).nth(4).click();

	expect(dialogs).toEqual([]);
	await expect(deleteButtons(page)).toHaveCount(6);
});

test('renaming a group that holds items is undone when leaving the field', async ({ page }) => {
	const dialogs = recordDialogs(page);
	const groupNames = await openPools(page);

	await groupNames.nth(1).fill('Patio');
	await groupNames.nth(1).blur();

	expect(dialogs).toEqual([REFUSAL]);
	await expect(groupNames.nth(1)).toHaveValue('Terrasse');
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the refusal is translated', async ({ page }) => {
		const dialogs = recordDialogs(page);
		await openPools(page);

		await page.getByRole('button', { name: 'Delete Group' }).nth(1).click();

		expect(dialogs).toEqual([
			"Ces pools contiennent encore des articles et ne peuvent être ni supprimés ni renommés : Sunny. Encaissez-les ou videz-les d'abord."
		]);
	});
});
