import { expect, test } from '@playwright/test';

/**
 * End-to-end cover for the shared payment-processor settings page.
 *
 * Every processor with credentials is served by one route, `[pspSlug=psp]`, which renders a
 * component named after the processor. Nothing in the type system says that component exists,
 * that the route matcher lets the slug through, or that the page renders at all — a missing
 * form would be a blank section in production, not a compile error. That is what these
 * assertions are for.
 *
 * The session comes from `auth.setup.ts`, which signs in once for the whole run.
 */

test('the shared route renders a card processor with its own fields', async ({ page }) => {
	await page.goto('/admin/stripe');

	// The heading comes from the manifest, the inputs from the processor's own component.
	await expect(page.getByRole('heading', { name: 'Stripe', level: 1 })).toBeVisible();
	await expect(page.locator('input[name="secretKey"]')).toBeVisible();
	await expect(page.locator('input[name="publicKey"]')).toBeVisible();
	// Present only because Stripe declares a configurable currency.
	await expect(page.locator('input[name="currency"]')).toHaveCount(1);
	// Scaffolding the route supplies to every processor, written once.
	await expect(page.getByRole('button', { name: 'Test connection' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
});

test('another card processor renders its own fields, not the first one’s', async ({ page }) => {
	await page.goto('/admin/sumup');

	await expect(page.getByRole('heading', { name: 'SumUp', level: 1 })).toBeVisible();
	await expect(page.locator('input[name="merchantCode"]')).toBeVisible();
	await expect(page.locator('input[name="secretKey"]')).toHaveCount(0);
});

test('a lightning processor also gets the invoice section, a card one does not', async ({
	page
}) => {
	await page.goto('/admin/blink');
	await expect(page.getByRole('heading', { name: 'Blink', level: 1 })).toBeVisible();
	await expect(page.locator('input[name="lnAddress"]')).toBeVisible();
	// Rendered from the declared method, not from the processor's name.
	await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();

	await page.goto('/admin/stripe');
	await expect(page.getByRole('heading', { name: 'Invoices' })).toHaveCount(0);
});

test('a processor settled by hand gets no settings page', async ({ page }) => {
	// `free` is a processor, but it is settled by hand and declares no credentials, so the
	// route matcher must not claim it.
	const response = await page.goto('/admin/free');

	expect(response?.status()).toBe(404);
	await expect(page.locator('form[action="?/save"]')).toHaveCount(0);
});

test('a static admin route still wins over the shared one', async ({ page }) => {
	// `/admin/config` is a real page. If the dynamic segment ever swallowed it, the shop would
	// lose its settings screen with nothing failing to compile.
	await page.goto('/admin/config');

	await expect(page.getByText('Preferred card processor')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Test connection' })).toHaveCount(0);
});

test('the processor picker links to the shared settings route', async ({ page }) => {
	await page.goto('/admin/config');

	// These links used to be three hand-written arrays that drifted from the enum beside them.
	// They come from the manifest now, so the hrefs prove the derivation end to end.
	for (const slug of ['stripe', 'sumup', 'blink']) {
		await expect(page.locator(`a[href="/admin/${slug}"]`)).toHaveCount(1);
	}
});

test('the back office navigation lists every processor that has settings', async ({ page }) => {
	await page.goto('/admin');

	// Each section of the sidebar is collapsed until its heading is clicked, so the links only
	// exist once Payment Settings is opened.
	await page.getByRole('button', { name: 'Payment Settings' }).click();

	// The navigation is built from the manifest, so a processor added there appears here with
	// no edit to the navigation itself.
	for (const label of ['Stripe', 'SumUp', 'Blink', 'Taler', 'Bitcoin nodeless']) {
		await expect(page.getByRole('link', { name: label, exact: true })).toHaveCount(1);
	}
});
