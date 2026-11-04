import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

const E2E_DB = 'bebop-e2e';
const PREVIOUS_HTML =
	'<p>Bonjour</p><a href="{{resetLink}}">go</a><img src="https://cdn.test/p.png">';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

const setResetTemplates = (data: Record<string, unknown>) =>
	withDb((db) =>
		db
			.collection('runtimeConfig')
			.updateOne(
				{ _id: 'resetEmailTemplates' as never },
				{ $set: { data, updatedAt: new Date() } },
				{ upsert: true }
			)
	);

test.beforeAll(() =>
	setResetTemplates({
		passwordReset: { subject: 'Réinitialisation', html: PREVIOUS_HTML, resetAt: new Date() }
	})
);

test.afterAll(() => setResetTemplates({}));

test('a template reset for safety shows its previous content until dismissed', async ({ page }) => {
	const notice = page
		.getByRole('alert')
		.filter({ hasText: 'reset to the default during an update' });
	await expect(async () => {
		await page.goto('/admin/template/emails');
		await expect(notice).toBeVisible({ timeout: 1000 });
	}).toPass();

	await notice.locator('summary', { hasText: 'Previous content' }).click();
	await expect(notice.locator('pre')).toHaveText(PREVIOUS_HTML);

	await notice.getByRole('button', { name: 'Dismiss this notice' }).click();
	await expect(notice).toHaveCount(0);
	const stored = await withDb((db) =>
		db.collection('runtimeConfig').findOne({ _id: 'resetEmailTemplates' as never })
	);
	expect(stored?.data).toEqual({});
});
