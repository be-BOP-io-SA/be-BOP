import { expect, test } from './client-ip.js';
import { choose, selectFor } from './select.js';

/**
 * End-to-end cover for the shared payment-processor settings page.
 *
 * Every processor with credentials is served by one route, `[pspSlug=psp]`, which draws the
 * fields the processor declares, or lets the processor draw them. Nothing in the type system
 * says that the route matcher lets the slug through, or that the page renders at all — a
 * missing form would be a blank section in production, not a compile error. That is what
 * these assertions are for.
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

test('a processor with its own folder gets its form from what it declares', async ({ page }) => {
	await page.goto('/admin/swiss-bitcoin-pay', { waitUntil: 'networkidle' });

	await expect(page.getByRole('heading', { name: 'Swiss Bitcoin Pay', level: 1 })).toBeVisible();
	const apiKey = page.getByLabel('API Key');
	await expect(apiKey).toHaveAttribute('name', 'apiKey');
	await expect(apiKey).toHaveAttribute('type', 'password');
	await expect(apiKey).toHaveAttribute('required', '');
	await expect(page.getByRole('heading', { name: 'Invoices' })).toBeVisible();

	try {
		await apiKey.fill('e2e-swiss-bitcoin-pay-key');
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');
		await page.reload();
		await expect(page.getByLabel('API Key')).toHaveValue('e2e-swiss-bitcoin-pay-key');
	} finally {
		// A saved key makes this the shop's Lightning processor for every spec that follows.
		await page.getByRole('button', { name: 'Reset' }).click();
		await page.waitForLoadState('networkidle');
	}
	await page.reload();
	await expect(page.getByLabel('API Key')).toHaveValue('');
});

test('a checkbox is saved checked, and comes back unchecked after a reset', async ({ page }) => {
	await page.goto('/admin/paypal', { waitUntil: 'networkidle' });
	const sandbox = page.getByLabel('Those credentials are for the sandbox environment');
	await expect(sandbox).toHaveAttribute('type', 'checkbox');
	await expect(sandbox).not.toBeChecked();

	try {
		await page.getByLabel('Client ID').fill('e2e-paypal-client');
		await page.getByLabel('Secret').fill('e2e-paypal-secret');
		// Last on purpose: ticking the box must leave what was just typed in place.
		await sandbox.check();
		await expect(page.getByLabel('Client ID')).toHaveValue('e2e-paypal-client');
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');
		await page.reload();
		await expect(page.getByLabel('Client ID')).toHaveValue('e2e-paypal-client');
		await expect(sandbox).toBeChecked();

		// An unchecked box is not posted at all, and must still be saved as unchecked.
		await sandbox.uncheck();
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');
		await page.reload();
		await expect(sandbox).not.toBeChecked();
		await expect(page.getByLabel('Client ID')).toHaveValue('e2e-paypal-client');
	} finally {
		// Saved credentials make PayPal a payment method of the shop for every spec that follows.
		await page.getByRole('button', { name: 'Reset' }).click();
		await page.waitForLoadState('networkidle');
	}
	await page.reload();
	await expect(page.getByLabel('Client ID')).toHaveValue('');
});

test('an optional field may stay empty, and a fixed setting is stated under the form', async ({
	page
}) => {
	await page.goto('/admin/osb', { waitUntil: 'networkidle' });
	await expect(page.getByLabel('HMAC-SHA-256 Key (optional)')).not.toHaveAttribute('required', '');
	await expect(page.getByLabel('REST API Password')).toHaveAttribute('required', '');
	await expect(page.getByText('Currency: XPF (fixed)')).toBeVisible();

	try {
		await page.getByLabel('Shop ID').fill('e2e-osb-shop');
		await page.getByLabel('REST API Password').fill('e2e-osb-password');
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');
		await page.reload();
		await expect(page.getByLabel('Shop ID')).toHaveValue('e2e-osb-shop');
		await expect(page.getByLabel('HMAC-SHA-256 Key (optional)')).toHaveValue('');
	} finally {
		await page.getByRole('button', { name: 'Reset' }).click();
		await page.waitForLoadState('networkidle');
	}
	await page.reload();
	await expect(page.getByLabel('Shop ID')).toHaveValue('');
});

test('a server address is stored without its trailing slash', async ({ page }) => {
	await page.goto('/admin/taler', { waitUntil: 'networkidle' });

	try {
		await page.getByLabel('Backend URL').fill('https://taler.e2e.example/');
		await page.getByLabel('Backend API Key').fill('e2e-taler-key');
		// Last on purpose: picking a currency must leave what was just typed in place.
		await choose(selectFor(page, 'currency'), 'USD', 'USD');
		await expect(page.getByLabel('Backend API Key')).toHaveValue('e2e-taler-key');
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');
		await page.reload();
		await expect(page.getByLabel('Backend URL')).toHaveValue('https://taler.e2e.example');
		await expect(page.locator('input[type=hidden][name="currency"]')).toHaveValue('USD');
	} finally {
		await page.getByRole('button', { name: 'Reset' }).click();
		await page.waitForLoadState('networkidle');
	}
	await page.reload();
	await expect(page.getByLabel('Backend URL')).toHaveValue('');
});

test('a processor that draws its own form links to what the shop is typing', async ({ page }) => {
	await page.goto('/admin/btcpay-server', { waitUntil: 'networkidle' });
	// By name: once the links show, the label of the API key also reads "Server URL".
	const serverUrl = page.locator('input[name="serverUrl"]');
	const storeId = page.locator('input[name="storeId"]');
	await expect(page.getByLabel('Server URL')).toHaveAttribute('type', 'url');
	await expect(page.getByRole('link', { name: 'your store settings' })).toHaveCount(0);

	try {
		await serverUrl.fill('https://btcpay.e2e.example/');
		await storeId.fill('e2e-store');
		await expect(page.locator('a', { hasText: 'your store settings' })).toHaveAttribute(
			'href',
			'https://btcpay.e2e.example/stores/e2e-store/lightning/BTC/settings'
		);
		await expect(page.locator('a', { hasText: 'your account settings' })).toHaveAttribute(
			'href',
			'https://btcpay.e2e.example/account/apikeys'
		);
		await expect(page.locator('code').first()).toHaveText('btcpay.store.cancreatelightninginvoice');

		await page.locator('input[name="apiKey"]').fill('e2e-btcpay-key');
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');
		await page.reload();
		await expect(serverUrl).toHaveValue('https://btcpay.e2e.example');
		await expect(storeId).toHaveValue('e2e-store');
	} finally {
		// Saved credentials make BTCPay a Lightning processor of the shop for the specs that follow.
		await page.getByRole('button', { name: 'Reset' }).click();
		await page.waitForLoadState('networkidle');
	}
	await page.reload();
	await expect(serverUrl).toHaveValue('');
});

test('a form with two ways to connect saves either, and refuses neither', async ({ page }) => {
	await page.goto('/admin/blink', { waitUntil: 'networkidle' });
	await expect(page.locator('form[action="?/save"] p strong')).toHaveText('one');
	await expect(
		page.getByRole('heading', { name: 'Option 1 — Lightning address (no API key)' })
	).toBeVisible();
	await expect(
		page.getByRole('heading', { name: 'Option 2 — API key (custodial account)' })
	).toBeVisible();
	await expect(page.getByLabel('Lightning address')).toHaveAttribute('placeholder', 'you@blink.sv');

	// No browser check stops an empty form: the refusal comes from the server.
	const refused = page.waitForResponse((response) => response.request().method() === 'POST');
	await page.getByRole('button', { name: 'Save' }).click();
	expect((await refused).ok()).toBe(false);

	await page.goto('/admin/blink', { waitUntil: 'networkidle' });
	try {
		await page.getByLabel('Lightning address').fill('  e2e@blink.sv ');
		await page.getByRole('button', { name: 'Save' }).click();
		await page.waitForLoadState('networkidle');
		await page.reload();
		await expect(page.getByLabel('Lightning address')).toHaveValue('e2e@blink.sv');
	} finally {
		await page.getByRole('button', { name: 'Reset' }).click();
		await page.waitForLoadState('networkidle');
	}
	await page.reload();
	await expect(page.getByLabel('Lightning address')).toHaveValue('');
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the declared form is labelled in the language of the back office', async ({ page }) => {
		await page.goto('/admin/swiss-bitcoin-pay');

		await expect(page.getByLabel('Clé API')).toHaveAttribute('name', 'apiKey');
	});

	test('a card processor is labelled in French too, its currency included', async ({ page }) => {
		await page.goto('/admin/stripe');

		await expect(page.getByLabel('Clé secrète')).toHaveAttribute('name', 'secretKey');
		await expect(page.getByLabel('Clé publique')).toHaveAttribute('name', 'publicKey');
		await expect(
			page.locator('label', { has: page.locator('input[name="currency"]') })
		).toContainText('Devise');

		await page.goto('/admin/sumup');

		await expect(page.getByLabel('Code marchand')).toHaveAttribute('placeholder', 'MXXXXXX');
	});

	test('a checkbox and a note under the form are in French too', async ({ page }) => {
		await page.goto('/admin/paypal');

		await expect(
			page.getByLabel("Ces identifiants sont destinés à l'environnement de test (sandbox)")
		).toHaveAttribute('name', 'sandbox');

		await page.goto('/admin/osb');

		await expect(page.getByLabel('Mot de passe API REST')).toHaveAttribute('name', 'password');
		await expect(page.getByText('Devise : XPF (fixe)')).toBeVisible();

		await page.goto('/admin/taler');

		await expect(page.getByLabel('URL du backend')).toHaveAttribute('name', 'backendUrl');
	});

	test('a form its processor draws is in French too', async ({ page }) => {
		await page.goto('/admin/btcpay-server', { waitUntil: 'networkidle' });

		await expect(page.getByLabel('URL du serveur')).toHaveAttribute(
			'placeholder',
			'p. ex. https://mainnet.demo.btcpayserver.org'
		);
		await page.getByLabel('URL du serveur').fill('https://btcpay.e2e.example');
		await expect(page.locator('a', { hasText: 'les paramètres de votre compte' })).toHaveAttribute(
			'aria-label',
			'Paramètres lightning dans votre boutique BTCPay Server'
		);

		await page.goto('/admin/blink');

		await expect(page.locator('form[action="?/save"] p strong')).toHaveText("l'une");
		await expect(
			page.getByRole('heading', { name: 'Option 1 — adresse Lightning (sans clé API)' })
		).toBeVisible();
	});
});

test('a processor settled by hand gets no settings page', async ({ page }) => {
	// `free` is a processor, but it is settled by hand and declares no credentials, so the
	// route matcher must not claim it.
	await page.goto('/admin/free');

	await expect(
		page.getByText('The page /admin/free you requested could not be found')
	).toBeVisible();
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
	// The sections open on click only once the page is hydrated.
	await page.goto('/admin', { waitUntil: 'networkidle' });

	// Each section of the sidebar is collapsed until its heading is clicked, so the links only
	// exist once Payment Settings is opened.
	await page.getByRole('button', { name: 'Payment Settings' }).click();

	// The navigation is built from the manifest, so a processor added there appears here with
	// no edit to the navigation itself.
	for (const label of ['Stripe', 'SumUp', 'Blink', 'Taler', 'Bitcoin nodeless']) {
		await expect(page.getByRole('link', { name: label, exact: true })).toHaveCount(1);
	}
});

test('the settings form keeps the width of the other settings pages on a wide screen', async ({
	page
}) => {
	await page.setViewportSize({ width: 1920, height: 1080 });
	for (const path of ['/admin/stripe', '/admin/smtp']) {
		await page.goto(path);
		const box = await page.locator('main').boundingBox();
		expect(box?.width, path).toBeLessThanOrEqual(1280);
	}
});
