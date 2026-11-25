import { expect, test, type Page } from './client-ip.js';

const switchForm = (page: Page) => page.locator('form[action="?/updateEnabled"]');

/** Puts the switch in the state asked, through the admin, as the shop does. */
async function setSwitch(page: Page, on: boolean) {
	await page.goto('/admin/api-keys');
	const box = switchForm(page).locator('input[name="enabled"]');
	// A click made before hydration is lost: retry until the box keeps its state.
	await expect(async () => {
		await box.setChecked(on);
		await expect(box).toBeChecked({ checked: on });
	}).toPass();
	await switchForm(page).locator('input[type="submit"]').click();
	await expect(page.locator('.alert-success')).toBeVisible();
}

test.afterEach(async ({ page }) => {
	// Off is the state a shop starts in, and the one the other specs expect.
	await setSwitch(page, false);
});

test('the API is off until the shop ticks the box: the public address is a 404, then answers', async ({
	page
}) => {
	await setSwitch(page, false);
	await page.goto('/admin/api-keys');
	await expect(page.getByText('API disabled', { exact: true })).toBeVisible();

	const off = await page.request.get('/api/v1/health');
	expect(off.status()).toBe(404);
	// Nothing in the answer says why: the shop looks like one without an API.
	expect(await off.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
	expect((await page.request.fetch('/api/v1/orders', { method: 'OPTIONS' })).status()).toBe(404);

	await setSwitch(page, true);
	await expect(page.getByText('API disabled', { exact: true })).toHaveCount(0);
	const on = await page.request.get('/api/v1/health');
	expect(on.status()).toBe(200);
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the page says the API is off, and the box is there to switch it on', async ({ page }) => {
		await setSwitch(page, false);
		await page.goto('/admin/api-keys');

		await expect(page.getByText('API désactivée', { exact: true })).toBeVisible();
		await expect(page.getByLabel('API activée')).not.toBeChecked();

		await setSwitch(page, true);
		await expect(page.getByLabel('API activée')).toBeChecked();
		await expect(page.getByText('API désactivée', { exact: true })).toHaveCount(0);
	});
});
