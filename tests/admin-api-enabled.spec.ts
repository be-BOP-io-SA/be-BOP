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
	// The router decodes an address before it picks the route: the switch must read it that way.
	for (const encoded of ['/api/v%31/health', '/%61pi/v1/openapi.json', '/api/%76%31/docs']) {
		expect((await page.request.get(encoded)).status(), encoded).toBe(404);
	}
	// A trailing slash must not make the router redirect before the switch has answered.
	for (const slashed of ['/api/v1/health/', '/api/v%31/health/', '/api/v1/docs/']) {
		const res = await page.request.get(slashed, { maxRedirects: 0 });
		expect(res.status(), slashed).toBe(404);
	}

	await setSwitch(page, true);
	expect((await page.request.get('/api/v1/health/', { maxRedirects: 0 })).status()).toBe(200);
	for (const encoded of ['/api/v%31/health', '/%61pi/v1/openapi.json']) {
		expect((await page.request.get(encoded)).status(), encoded).toBe(200);
	}
	await expect(page.getByText('API disabled', { exact: true })).toHaveCount(0);
	const on = await page.request.get('/api/v1/health');
	expect(on.status()).toBe(200);
});

test('an /api/v1 address no route owns is a JSON 404, switched on or off, never a page of the site', async ({
	page
}) => {
	const unknown = [
		'/api/v1',
		'/api/v1/',
		'/api/v1/zzz',
		'/api/v1/zzz/',
		'/api/v%31/zzz',
		'/api/v1/orders/abc',
		'/api/v1/catalog/products//'
	];
	for (const on of [false, true]) {
		await setSwitch(page, on);
		for (const path of unknown) {
			const res = await page.request.get(path, { maxRedirects: 0 });
			expect(res.status(), `${path} (${on ? 'on' : 'off'})`).toBe(404);
			expect(await res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
		}
		// The prefix is /api/v1 and nothing around it: these stay pages of the site.
		for (const neighbour of ['/api/v10', '/apiv1']) {
			const res = await page.request.get(neighbour);
			expect(res.headers()['content-type'], neighbour).toMatch(/text\/html/);
		}
	}
	// A real route is still the one that answers, switched on.
	expect((await page.request.get('/api/v1/health')).status()).toBe(200);
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
