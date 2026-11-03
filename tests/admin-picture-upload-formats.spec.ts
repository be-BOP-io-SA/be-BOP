import { expect, test } from '@playwright/test';

test('the picture upload names and accepts every supported format', async ({ page }) => {
	await page.goto('/admin/picture/new');

	await expect(page.getByText('JPEG, PNG, WebP, AVIF or SVG file')).toBeVisible();
	const accepted = (await page.locator('input[type="file"]').getAttribute('accept'))?.split(',');
	expect(accepted).toEqual(
		expect.arrayContaining(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'])
	);
});

test('the product form accepts AVIF and SVG pictures', async ({ page }) => {
	await page.goto('/admin/product/new');

	await expect(page.locator('input[type="file"]')).toHaveAttribute(
		'accept',
		/image\/avif,image\/svg\+xml/
	);
	await expect(page.getByText('(JPEG, PNG, WebP, AVIF, SVG)')).toBeVisible();
});

for (const path of [
	'/admin/picture/new',
	'/admin/product/new',
	'/admin/product/default-picture',
	'/admin/schedule/new',
	'/admin/schedule/event-default-picture',
	'/admin/gallery/new',
	'/admin/slider/new',
	'/admin/tags/new'
]) {
	test(`${path} offers AVIF and SVG in its file picker`, async ({ page }) => {
		await page.goto(path);

		const inputs = page.locator('input[type="file"]');
		expect(await inputs.count()).toBeGreaterThan(0);
		for (const input of await inputs.all()) {
			await expect(input).toHaveAttribute(
				'accept',
				'image/jpeg,image/png,image/webp,image/avif,image/svg+xml'
			);
		}
	});
}

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the upload labels are translated', async ({ page }) => {
		await page.goto('/admin/picture/new');
		await expect(page.getByText('Fichier JPEG, PNG, WebP, AVIF ou SVG')).toBeVisible();

		await page.goto('/admin/product/new');
		await expect(
			page.getByText('Téléchargez une ou plusieurs images du produit (JPEG, PNG, WebP, AVIF, SVG)')
		).toBeVisible();
	});
});
