import { expect, test, type Page } from '@playwright/test';
import { MongoClient } from 'mongodb';

const E2E_DB = 'bebop-e2e';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

async function setSmtp(data: Record<string, unknown>) {
	await withDb((db) =>
		db
			.collection('runtimeConfig')
			.updateOne(
				{ _id: 'smtp' as never },
				{ $set: { data, updatedAt: new Date() } },
				{ upsert: true }
			)
	);
}

async function openSmtpSettings(page: Page) {
	const host = page.getByPlaceholder('smtp.example.com');
	await expect(async () => {
		await page.goto('/admin/smtp');
		await expect(host).toHaveValue('mail.shop.example', { timeout: 1000 });
	}).toPass();
	return host;
}

test.beforeAll(() =>
	setSmtp({
		host: 'mail.shop.example',
		port: 587,
		user: 'shop',
		password: 'saved-secret',
		from: 'shop@shop.example',
		fake: false
	})
);

test.afterAll(() => setSmtp({ host: '', port: 587, user: '', password: '', from: '', fake: true }));

test('changing the SMTP host warns that the saved password will be cleared', async ({ page }) => {
	const host = await openSmtpSettings(page);
	const warning = page.getByText('saving will clear the saved password');
	await expect(warning).toHaveCount(0);

	await expect(async () => {
		await host.fill('mail.other.example');
		await expect(warning).toBeVisible({ timeout: 1000 });
	}).toPass();

	await page.getByPlaceholder('Password is set').fill('new-secret');
	await expect(warning).toHaveCount(0);
});

test('changing the SMTP port warns as well', async ({ page }) => {
	await openSmtpSettings(page);
	const port = page.locator('input[name="port"]');

	await expect(async () => {
		await port.fill('465');
		await expect(page.getByText('saving will clear the saved password')).toBeVisible({
			timeout: 1000
		});
	}).toPass();
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the warning is translated', async ({ page }) => {
		const host = page.locator('input[name="host"]');
		await expect(async () => {
			await page.goto('/admin/smtp');
			await expect(host).toHaveValue('mail.shop.example', { timeout: 1000 });
			await host.fill('mail.other.example');
			await expect(page.getByText("l'enregistrement effacera le mot de passe")).toBeVisible({
				timeout: 1000
			});
		}).toPass();
	});
});
