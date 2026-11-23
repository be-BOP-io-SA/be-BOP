import { expect, test } from './client-ip.js';

test('the journal size field holds back a zero the server would refuse', async ({ page }) => {
	await page.goto('/admin/api-keys');
	const size = page.getByLabel('Maximum size (MB)');
	const save = page.getByRole('button', { name: 'Save journal settings' });

	await size.fill('0');
	await save.click();

	// The browser keeps the form: nothing is posted, so the page neither moves nor errors.
	expect(await size.evaluate((input: HTMLInputElement) => input.validity.rangeUnderflow)).toBe(
		true
	);
	await expect(page).toHaveURL(/\/admin\/api-keys$/);
	await expect(page.getByText('Journal settings updated.')).toHaveCount(0);

	await size.fill('5');
	await save.click();
	await expect(page.getByText('Journal settings updated.')).toBeVisible();

	// Back to no limit, the state the other specs start from.
	await size.fill('');
	await save.click();
	await expect(page.getByText('Journal settings updated.')).toBeVisible();
});
