import { expect, test, type Page } from '@playwright/test';

const ZPUB =
	'zpub6r8LffkeFh5if3FefxX5zq5oQnQbLxXXPE87fEskLhY2v37Tj16TzMqRL7p32wQweeq1DpRYWrvm4t3ArKHrLNnVhPkFsHGdo3h6nyoppeS';

async function fillSetupForm(page: Page, derivationIndex: string) {
	await page.goto('/admin/bitcoin-nodeless');
	// Neither case saves anything, so the page is always on its first-time set-up form.
	await expect(page.getByRole('button', { name: 'Set up' })).toBeVisible();
	await page.locator('input[name="publicKey"]').fill(ZPUB);
	await page.locator('input[name="derivationIndex"]').fill(derivationIndex);
}

test('the browser stops a negative derivation index before submitting', async ({ page }) => {
	await fillSetupForm(page, '-1');
	await page.getByRole('button', { name: 'Set up' }).click();

	const isValid = await page
		.locator('input[name="derivationIndex"]')
		.evaluate((input: HTMLInputElement) => input.validity.valid);
	expect(isValid).toBe(false);
	await expect(page.getByRole('button', { name: 'Set up' })).toBeVisible();
});

test('the server refuses a decimal derivation index the browser let through', async ({ page }) => {
	await fillSetupForm(page, '1.5');
	// Stand in for a client that ignores the input's bounds.
	await page
		.locator('form', { has: page.locator('input[name="derivationIndex"]') })
		.evaluate((form: HTMLFormElement) => form.setAttribute('novalidate', ''));
	await page.getByRole('button', { name: 'Set up' }).click();

	await expect(page.getByText('Expected integer, received float')).toBeVisible();
	await page.reload();
	await expect(page.getByRole('button', { name: 'Set up' })).toBeVisible();
});
