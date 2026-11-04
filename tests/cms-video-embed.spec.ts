import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

const E2E_DB = 'bebop-e2e';
const SLUG = 'e2e-cms-video';
const YOUTUBE = 'https://www.youtube.com/embed/dQw4w9WgXcQ';

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
				title: 'E2E video page',
				shortDescription: '',
				content: `<p>Our video</p><iframe src="${YOUTUBE}" allowfullscreen=""></iframe><script>window.x = 1</script>`,
				fullScreen: false,
				maintenanceDisplay: false,
				hasMobileContent: false,
				hasEmployeeContent: false,
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

test('a CMS page keeps its YouTube embed and drops its script', async ({ page }) => {
	await page.goto(`/${SLUG}`);

	await expect(page.getByText('Our video')).toBeVisible();
	await expect(page.locator(`iframe[src="${YOUTUBE}"]`)).toHaveCount(1);
	expect(await page.evaluate(() => (window as unknown as { x?: number }).x)).toBeUndefined();
});

test('the CMS editor names the content visitors will not see', async ({ page }) => {
	await page.goto(`/admin/cms/${SLUG}`);

	await expect(page.getByRole('alert')).toContainText(
		'it is removed when the page is displayed: <script>.'
	);
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the CMS editor warning is translated', async ({ page }) => {
		await page.goto(`/admin/cms/${SLUG}`);

		await expect(page.getByRole('alert')).toContainText(
			"elle est retirée à l'affichage de la page : <script>."
		);
	});
});
