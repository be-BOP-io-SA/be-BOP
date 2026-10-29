import { expect, test, type APIRequestContext } from '@playwright/test';
import { readFile } from 'fs/promises';
import { MongoClient } from 'mongodb';
import sharp from 'sharp';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';

const PAGES = [
	{
		form: '/admin/product/default-picture',
		redirect: /\/admin\/product$/,
		asset: 'default-picture.png',
		configKey: 'defaultProductPictureId'
	},
	{
		form: '/admin/schedule/event-default-picture',
		redirect: /\/admin\/schedule$/,
		asset: 'event-default-picture.png',
		configKey: 'defaultEventPictureId'
	}
];

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

const bundled = new Map<string, Buffer>();

test.beforeAll(async () => {
	for (const { asset } of PAGES) {
		bundled.set(asset, await readFile(`src/lib/assets/${asset}`));
	}
});

async function forgetUploads() {
	await withDb(async (db) => {
		for (const { configKey } of PAGES) {
			await db
				.collection<{ _id: string; data: string }>('runtimeConfig')
				.updateOne({ _id: configKey }, { $set: { data: '' } });
		}
	});
}

test.afterAll(forgetUploads);

async function served(request: APIRequestContext, asset: string) {
	const response = await request.get(`/asset/${asset}`);
	expect(response.ok()).toBe(true);
	const { format, width, height } = await sharp(await response.body()).metadata();
	return { url: response.url(), format, width, height };
}

for (const { form, redirect, asset } of PAGES) {
	test(`/asset/${asset} serves the bundled picture until one is uploaded`, async ({ request }) => {
		await forgetUploads();

		// The server picks up the configuration change asynchronously.
		await expect
			.poll(async () => (await request.get(`/asset/${asset}`)).body())
			.toEqual(bundled.get(asset));
	});

	test(`${form} stores an AVIF picture outside the application`, async ({ page }) => {
		const avif = await sharp({
			create: { width: 64, height: 48, channels: 3, background: '#c33' }
		})
			.avif()
			.toBuffer();

		await page.goto(form);
		await page
			.locator('input[type="file"]')
			.setInputFiles({ name: 'red.avif', mimeType: 'image/avif', buffer: avif });
		await page.locator('input[type="submit"]').click();

		await expect(page).toHaveURL(redirect);
		const picture = await served(page.request, asset);
		expect(picture).toMatchObject({ format: 'webp', width: 64, height: 48 });
		expect(picture.url).not.toContain('/asset/');
		expect(await readFile(`src/lib/assets/${asset}`)).toEqual(bundled.get(asset));

		await page.goto(form);
		const preview = page.locator('form img');
		await expect.poll(() => preview.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(64);
	});

	test(`${form} takes an SVG picture and keeps only a rendering`, async ({ page }) => {
		await page.goto(form);
		await page.locator('input[type="file"]').setInputFiles('tests/fixtures/hostile.svg');
		await page.locator('input[type="submit"]').click();

		await expect(page).toHaveURL(redirect);
		expect(await served(page.request, asset)).toMatchObject({
			format: 'webp',
			width: 2048,
			height: 1024
		});
	});
}

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the product default picture form uploads and shows the picture', async ({ page }) => {
		const png = await sharp({
			create: { width: 40, height: 30, channels: 3, background: '#36c' }
		})
			.png()
			.toBuffer();

		await page.goto('/admin/product/default-picture');
		await expect(
			page.getByRole('heading', { name: 'Ajouter une image par défaut pour le produit' })
		).toBeVisible();
		await page
			.locator('input[type="file"]')
			.setInputFiles({ name: 'bleu.png', mimeType: 'image/png', buffer: png });
		await page.getByRole('button', { name: 'Ajouter', exact: true }).click();

		await expect(page).toHaveURL(/\/admin\/product$/);
		await page.goto('/admin/product/default-picture');
		await expect(page.getByText('Image actuelle')).toBeVisible();
		await expect
			.poll(() => page.locator('form img').evaluate((img: HTMLImageElement) => img.naturalWidth))
			.toBe(40);
	});
});
