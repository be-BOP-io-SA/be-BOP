import { expect, test, type BrowserContext } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { createHash, randomUUID } from 'node:crypto';

const E2E_DB = 'bebop-e2e';
const EDITOR_ROLE = 'e2e-template-editor';
const EDITOR_LOGIN = 'e2e-template-editor';
const NOTE = 'Only the super admin can edit this template';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

async function cleanUp() {
	await withDb(async (db) => {
		const user = await db.collection('users').findOne({ login: EDITOR_LOGIN });
		if (user) {
			await db.collection('sessions').deleteMany({ userId: user._id });
			await db.collection('users').deleteOne({ _id: user._id });
		}
		await db.collection('roles').deleteOne({ _id: EDITOR_ROLE as never });
	});
}

async function signInAsEditor(context: BrowserContext) {
	const userId = new ObjectId();
	const token = randomUUID();
	await withDb(async (db) => {
		await db.collection('roles').insertOne({
			_id: EDITOR_ROLE as never,
			name: 'E2E template editor',
			hasPosOptions: false,
			permissions: { read: [], write: ['/admin/template/*'], forbidden: [] },
			createdAt: new Date(),
			updatedAt: new Date()
		});
		await db.collection('users').insertOne({
			_id: userId,
			login: EDITOR_LOGIN,
			roleId: EDITOR_ROLE,
			createdAt: new Date(),
			updatedAt: new Date()
		});
		await db.collection('sessions').insertOne({
			_id: new ObjectId(),
			sessionId: createHash('sha256').update(token).digest('hex'),
			userId,
			createdAt: new Date(),
			updatedAt: new Date(),
			expiresAt: new Date(Date.now() + 3600_000)
		});
	});
	await context.clearCookies();
	await context.addCookies([
		{ name: 'bootik-session', value: token, url: 'http://localhost:5012' }
	]);
}

test.beforeAll(cleanUp);
test.afterAll(cleanUp);

test('a template carrying a sign-in link is read-only for anyone but the super admin', async ({
	page,
	context
}) => {
	const resetForm = () =>
		page.locator('form').filter({ has: page.getByRole('heading', { name: 'passwordReset' }) });

	await page.goto('/admin/template/emails');
	await expect(resetForm().locator('textarea[name="html"]')).toBeEditable();
	await expect(resetForm().getByText(NOTE)).toHaveCount(0);

	await signInAsEditor(context);
	await page.goto('/admin/template/emails');
	await expect(resetForm().getByText(NOTE)).toBeVisible();
	await expect(resetForm().locator('textarea[name="html"]')).not.toBeEditable();
	await expect(resetForm().getByRole('button', { name: 'Update' })).toBeDisabled();

	const response = await page.request.post('/admin/template/emails?/update', {
		form: { key: 'passwordReset', subject: 'Edited subject', html: '<p>{{resetLink}}</p>' },
		headers: { origin: 'http://localhost:5012', accept: 'text/html' }
	});
	expect(response.status()).toBe(403);
	const body = await response.text();
	expect(body).toContain(NOTE);
	expect(body).toContain('Edited subject');
});
