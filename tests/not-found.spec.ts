import { expect, test } from '@playwright/test';

// What a stranger sees: no session needed, and none should be.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * A shop renders its own error page when nothing matches a URL, which is the point — an
 * operator customises it. What it must not do is answer 200 while doing so: a soft 404 is
 * indexed by search engines as a real page and read by uptime monitoring as healthy.
 */

test('an unknown page answers 404', async ({ page }) => {
	const response = await page.goto('/this-page-does-not-exist');

	expect(response?.status()).toBe(404);
});

test('an unknown nested path answers 404 too', async ({ page }) => {
	// Deeper URLs are served by a different route from single-segment ones, and each had its
	// own fallback to the error page.
	const response = await page.goto('/no/such/place');

	expect(response?.status()).toBe(404);
});

test('a real page still answers 200', async ({ page }) => {
	const response = await page.goto('/');

	expect(response?.status()).toBe(200);
});
