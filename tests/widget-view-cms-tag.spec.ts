import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const TAG_ID = 'e2e-cms-tag';
const GALLERY_ID = 'e2e-cms-gallery';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

const snippets = (page: import('@playwright/test').Page) =>
	page.getByTestId('cms-tag-snippet').locator('code');

test.beforeAll(async () => {
	await withDb(async (db) => {
		await db.collection('tags').replaceOne(
			{ _id: TAG_ID as never },
			{
				name: 'E2E CMS tag',
				title: 'E2E tag',
				subtitle: '',
				content: 'Tag content',
				shortContent: '',
				cta: [],
				menu: [],
				widgetUseOnly: true,
				productTagging: false,
				useLightDark: false,
				reportingFilter: false,
				printReceiptFilter: false,
				cssOveride: '',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
		const block = { title: 'Block', content: 'Text', cta: { label: '', href: '' } };
		await db.collection('galleries').replaceOne(
			{ _id: GALLERY_ID as never },
			{
				name: 'E2E gallery',
				principal: block,
				secondary: [block, block, block],
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		await db.collection('tags').deleteOne({ _id: TAG_ID as never });
		await db.collection('galleries').deleteOne({ _id: GALLERY_ID as never });
	});
});

test('staff see the CMS tag of each tag disposition and can copy it', async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await page.goto(`/tag/${TAG_ID}`, { waitUntil: 'networkidle' });

	await expect(snippets(page)).toHaveText([
		`[Tag=${TAG_ID}?display=var-1]`,
		`[Tag=${TAG_ID}?display=var-1?titleCase=regular]`,
		`[Tag=${TAG_ID}?display=var-1-reverse]`,
		`[Tag=${TAG_ID}?display=var-2]`,
		`[Tag=${TAG_ID}?display=var-3]`,
		`[Tag=${TAG_ID}?display=var-4]`,
		`[Tag=${TAG_ID}?display=var-4-reverse]`,
		`[Tag=${TAG_ID}?display=var-5]`,
		`[Tag=${TAG_ID}?display=var-6]`
	]);

	const fourth = page.getByTestId('cms-tag-snippet').nth(3);
	await fourth.getByRole('button', { name: 'Copy' }).click();
	await expect(fourth.getByRole('button', { name: 'Copied' })).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
		`[Tag=${TAG_ID}?display=var-2]`
	);
});

test('other widget view pages show their CMS tag too', async ({ page }) => {
	await page.goto(`/gallery/${GALLERY_ID}`);
	await expect(snippets(page)).toHaveText([`[Gallery=${GALLERY_ID}]`]);
});

test.describe('for visitors', () => {
	test.use({ storageState: { cookies: [], origins: [] } });

	test('no CMS tag is shown', async ({ page }) => {
		await page.goto(`/tag/${TAG_ID}`);
		await expect(page.getByText('E2E tag').first()).toBeVisible();
		await expect(page.getByTestId('cms-tag-snippet')).toHaveCount(0);
	});
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the snippet is translated', async ({ page }) => {
		await page.goto(`/gallery/${GALLERY_ID}`);
		await expect(page.getByTestId('cms-tag-snippet')).toContainText('Tag CMS :');
		await expect(page.getByRole('button', { name: 'Copier' })).toBeVisible();
	});
});
