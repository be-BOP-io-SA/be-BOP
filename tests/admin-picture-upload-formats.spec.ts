import { expect, test } from '@playwright/test';

test('the picture upload names and accepts every supported format', async ({ page }) => {
	await page.goto('/admin/picture/new');

	await expect(page.getByText('JPEG, PNG, WebP or AVIF file')).toBeVisible();
	const accepted = (await page.locator('input[type="file"]').getAttribute('accept'))?.split(',');
	expect(accepted).toEqual(
		expect.arrayContaining(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
	);
});

test('the product form accepts AVIF pictures', async ({ page }) => {
	await page.goto('/admin/product/new');

	await expect(page.locator('input[type="file"]')).toHaveAttribute('accept', /image\/avif/);
	await expect(page.getByText('(JPEG, PNG, WebP, AVIF)')).toBeVisible();
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the upload labels are translated', async ({ page }) => {
		await page.goto('/admin/picture/new');
		await expect(page.getByText('Fichier JPEG, PNG, WebP ou AVIF')).toBeVisible();

		await page.goto('/admin/product/new');
		await expect(
			page.getByText('Téléversez une ou plusieurs images du produit (JPEG, PNG, WebP, AVIF)')
		).toBeVisible();
	});
});
