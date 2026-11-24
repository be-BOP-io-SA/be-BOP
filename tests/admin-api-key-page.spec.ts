import { MongoClient } from 'mongodb';
import { expect, test, type Page } from './client-ip.js';

const E2E_DB = 'bebop-e2e';

async function storedKey(name: string) {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await client.db(E2E_DB).collection('apiKeys').findOne({ name });
	} finally {
		await client.close();
	}
}

/** Creates a key through the admin and opens its page. */
async function createKey(page: Page, name: string) {
	await page.goto('/admin/api-keys/new');
	const nameField = page.locator('input[name="name"]');
	// A fill done before hydration is wiped: retry until the field keeps the value.
	await expect(async () => {
		await nameField.fill(name);
		await expect(nameField).toHaveValue(name);
	}).toPass();
	await page.locator('input[name="scopes"][value="pos:read"]').check();
	await page.locator('form button[type="submit"], form input[type="submit"]').last().click();
	await expect(page).toHaveURL(/\/admin\/api-keys\/new\/reveal/);

	const key = await storedKey(name);
	if (!key) {
		throw new Error(`API key ${name} was not created`);
	}
	await page.goto(`/admin/api-keys/${key._id.toString()}`);
	await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
}

test('the creation form says what each right gives, stream and point-of-sale ones included', async ({
	page
}) => {
	await page.goto('/admin/api-keys/new');

	await expect(
		page.getByText('Follow orders as they happen, over the event streams under /api/v1/orders.')
	).toBeVisible();
	await expect(page.getByText('Send till sales via POST /api/v1/pos/orders.')).toBeVisible();
	await expect(
		page.getByText('Follow paid orders as they happen via GET /api/v1/pos/orders/stream.')
	).toBeVisible();
	await expect(page.getByText('Read the point-of-sale catalog and paid orders')).toBeVisible();
});

test('one Save button saves every setting of a key, and stays in view with Revoke', async ({
	page
}) => {
	const name = `e2e-key-${Date.now()}`;
	await createKey(page, name);

	// One way to save, whatever the section.
	const save = page.getByRole('button', { name: 'Save', exact: true });
	await expect(save).toHaveCount(1);
	await expect(page.getByRole('button', { name: /^Save / })).toHaveCount(0);

	// Before any scroll, on a page taller than the screen, both buttons are already there.
	const revoke = page.getByRole('button', { name: 'Revoke key' });
	await expect(save).toBeInViewport();
	await expect(revoke).toBeInViewport();
	await page.getByRole('heading', { name, level: 1 }).scrollIntoViewIfNeeded();
	await expect(save).toBeInViewport();
	await expect(revoke).toBeInViewport();

	// A button whose colour the theme does not have would be white on white.
	const suspend = page.getByRole('button', { name: 'Suspend key' });
	expect(await suspend.evaluate((button) => getComputedStyle(button).backgroundColor)).not.toMatch(
		/rgba\(0, 0, 0, 0\)|transparent/
	);

	// The browser refuses what the server would refuse, before anything is posted.
	const lifetime = page.getByLabel('Close each stream after (seconds)');
	await lifetime.fill('0');
	await save.click();
	expect(await lifetime.evaluate((input: HTMLInputElement) => input.validity.rangeUnderflow)).toBe(
		true
	);
	await expect(page.getByText('Changes saved.')).toHaveCount(0);

	await lifetime.fill('600');
	await page.getByLabel('Concurrent streams allowed').fill('3');
	await page.getByLabel('Restrict this key to its own orders').check();
	await page.getByLabel('Accept several orders with the same external id').check();
	// Off until the shop says otherwise.
	const mayTurnOff = page.getByLabel('May turn notifications off');
	await expect(mayTurnOff).not.toBeChecked();
	await mayTurnOff.check();
	await save.click();
	await expect(page.getByText('Changes saved.')).toBeVisible();

	expect(await storedKey(name)).toMatchObject({
		streamLifetimeSeconds: 600,
		maxConcurrentStreams: 3,
		ownOrdersOnly: true,
		acceptDuplicateExternalOrderIds: true,
		canDisableNotifications: true
	});
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the key page saves with its single button', async ({ page }) => {
		const name = `e2e-cle-${Date.now()}`;
		await createKey(page, name);

		const save = page.getByRole('button', { name: 'Enregistrer', exact: true });
		await expect(save).toHaveCount(1);
		await save.click();
		await expect(page.getByText('Modifications enregistrées.')).toBeVisible();
	});

	test('a key may be allowed to turn notifications off, off by default', async ({ page }) => {
		const name = `e2e-cle-notif-${Date.now()}`;
		await createKey(page, name);

		const mayTurnOff = page.getByLabel('Peut couper les notifications');
		await expect(mayTurnOff).not.toBeChecked();
		await expect(page.getByText('Décochée, cette demande est ignorée')).toBeVisible();
		expect((await storedKey(name))?.canDisableNotifications).toBeUndefined();

		await mayTurnOff.check();
		await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
		await expect(page.getByText('Modifications enregistrées.')).toBeVisible();
		await expect(page.getByLabel('Peut couper les notifications')).toBeChecked();
		expect((await storedKey(name))?.canDisableNotifications).toBe(true);
	});

	test('the creation form describes the stream and point-of-sale rights', async ({ page }) => {
		await page.goto('/admin/api-keys/new');

		await expect(
			page.getByText('Envoyer les ventes de la caisse via POST /api/v1/pos/orders.')
		).toBeVisible();
		await expect(
			page.getByText(
				"Suivre les commandes en direct, par les flux d'événements sous /api/v1/orders."
			)
		).toBeVisible();
	});
});
