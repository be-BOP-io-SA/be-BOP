import { expect, test } from '@playwright/test';

// These run without the saved session on purpose: the point is what a stranger sees.
test.use({ storageState: { cookies: [], origins: [] } });

test('the admin tree is closed to a visitor without a session', async ({ page }) => {
	await page.goto('/admin');

	await expect(page).toHaveURL(/\/admin\/login$/);
});

test('the shared processor settings page is behind the same guard', async ({ page }) => {
	// The route is new, and a route that answered before the guard ran would hand a stranger
	// the shop's payment credentials.
	await page.goto('/admin/stripe');

	await expect(page).toHaveURL(/\/admin\/login$/);
	await expect(page.locator('input[name="secretKey"]')).toHaveCount(0);
});

test('the login page is reachable, and is the only admin page that is', async ({ page }) => {
	await page.goto('/admin/login');

	await expect(page.locator('input[name="login"]')).toBeVisible();
	await expect(page.locator('input[name="password"]')).toBeVisible();
});
