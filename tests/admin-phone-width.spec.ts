import { expect, test, type Page } from './client-ip.js';

/** How far the page can be scrolled sideways: anything above zero hides content off screen. */
function sidewaysScroll(page: Page) {
	return page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
}

for (const locale of ['en-US', 'fr-FR']) {
	test.describe(`on a phone, in ${locale}`, () => {
		test.use({ locale, viewport: { width: 390, height: 844 } });

		test('the general settings fit the screen', async ({ page }) => {
			await page.goto('/admin/config', { waitUntil: 'networkidle' });

			expect(await sidewaysScroll(page)).toBe(0);
		});

		test('the BTCPay settings fit the screen once their links show', async ({ page }) => {
			await page.goto('/admin/btcpay-server', { waitUntil: 'networkidle' });
			await page.locator('input[name="serverUrl"]').fill('https://btcpay.e2e.example');
			await page.locator('input[name="storeId"]').fill('e2e-store');
			await expect(page.locator('code')).toHaveCount(2);

			expect(await sidewaysScroll(page)).toBe(0);
		});
	});
}
