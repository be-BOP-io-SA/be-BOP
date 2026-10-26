import { expect, test, type APIRequestContext } from '@playwright/test';
import { readFile, writeFile } from 'fs/promises';
import sharp from 'sharp';

const PAGES = [
	{
		form: '/admin/product/default-picture',
		redirect: /\/admin\/product$/,
		asset: 'default-picture.png'
	},
	{
		form: '/admin/schedule/event-default-picture',
		redirect: /\/admin\/schedule$/,
		asset: 'event-default-picture.png'
	}
];

// These forms overwrite tracked files of the checkout.
const originals = new Map<string, Buffer>();

test.beforeAll(async () => {
	for (const { asset } of PAGES) {
		originals.set(asset, await readFile(`src/lib/assets/${asset}`));
	}
});

test.afterAll(async () => {
	for (const [asset, content] of originals) {
		await writeFile(`src/lib/assets/${asset}`, content);
	}
});

async function servedSize(request: APIRequestContext, asset: string) {
	const served = await (await request.get(`/asset/${asset}`)).body();
	const { format, width, height } = await sharp(served).metadata();
	return { format, width, height };
}

for (const { form, redirect, asset } of PAGES) {
	test(`${form} takes an AVIF picture`, async ({ page }) => {
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
		expect(await servedSize(page.request, asset)).toEqual({ format: 'png', width: 64, height: 48 });
	});

	test(`${form} takes an SVG picture and keeps only a PNG rendering`, async ({ page }) => {
		await page.goto(form);
		await page.locator('input[type="file"]').setInputFiles('tests/fixtures/hostile.svg');
		await page.locator('input[type="submit"]').click();

		await expect(page).toHaveURL(redirect);
		expect(await servedSize(page.request, asset)).toEqual({
			format: 'png',
			width: 2048,
			height: 1024
		});
	});
}
