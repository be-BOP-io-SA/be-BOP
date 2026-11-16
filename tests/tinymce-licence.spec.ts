import { expect, test } from './client-ip.js';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const SLUG = 'e2e-tinymce-licence';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

test.beforeAll(async () => {
	await withDb((db) =>
		db.collection('cmsPages').replaceOne(
			{ _id: SLUG as never },
			{
				title: 'E2E TinyMCE licence',
				shortDescription: '',
				content: '<p>Desktop</p>',
				mobileContent: '<p>Mobile</p>',
				employeeContent: '<p>Employee</p>',
				fullScreen: false,
				maintenanceDisplay: false,
				// Each of these shows its own editor, so all three editors of the form are checked.
				hasMobileContent: true,
				hasEmployeeContent: true,
				displayRawContent: false,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		)
	);
});

test.afterAll(async () => {
	await withDb((db) => db.collection('cmsPages').deleteOne({ _id: SLUG as never }));
});

test('the CMS editors run under the GPL licence, not in evaluation mode', async ({ page }) => {
	const messages: string[] = [];
	page.on('console', (message) => messages.push(message.text()));

	await page.goto(`/admin/cms/${SLUG}`);

	// TinyMCE checks the licence during init, before it marks the editor initialized.
	await page.waitForFunction(() => {
		const editors =
			(window as unknown as { tinymce?: { get(): { initialized: boolean }[] } }).tinymce?.get() ??
			[];
		return editors.length === 3 && editors.every((editor) => editor.initialized);
	});

	expect(messages.filter((text) => text.includes('evaluation mode'))).toEqual([]);
});
