import { expect, test, type BrowserContext } from './client-ip.js';
import { MongoClient, ObjectId } from 'mongodb';
import { createHash, randomUUID } from 'node:crypto';

const E2E_DB = 'bebop-e2e';
const EDITOR_ROLE = 'e2e-template-editor';
const EDITOR_LOGIN = 'e2e-template-editor';
const SUBJECT = 'E2E edited reset subject';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

let savedTemplates: unknown;

async function removeEditor() {
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

test.beforeAll(async () => {
	await removeEditor();
	savedTemplates = await withDb(async (db) =>
		db.collection('runtimeConfig').findOne({ _id: 'emailTemplates' as never })
	);
});

test.afterAll(async ({ playwright }) => {
	await removeEditor();
	// Deleting the stored templates never reaches the server's memory; the reset action does.
	const admin = await playwright.request.newContext({
		storageState: 'playwright/.auth/admin.json'
	});
	const reset = await admin.post('http://localhost:5012/admin/template/emails?/reset', {
		form: { key: 'passwordReset' },
		headers: { origin: 'http://localhost:5012' }
	});
	expect(reset.ok()).toBe(true);
	await admin.dispose();
	// The shop's templates are shared by the whole suite: put back what this test changed.
	await withDb(async (db) => {
		const templates = db.collection('runtimeConfig');
		if (savedTemplates) {
			await templates.replaceOne({ _id: 'emailTemplates' as never }, savedTemplates as never);
		} else {
			await templates.deleteOne({ _id: 'emailTemplates' as never });
		}
	});
});

test('an employee who can write the templates saves a sign-in template', async ({
	page,
	context
}) => {
	const resetForm = () =>
		page.locator('form').filter({ has: page.getByRole('heading', { name: 'passwordReset' }) });

	await signInAsEditor(context);
	// Hydration resets the fields, so they are filled only once the page is hydrated.
	await page.goto('/admin/template/emails', { waitUntil: 'networkidle' });
	await resetForm().locator('input[name="subject"]').fill(SUBJECT);
	await resetForm().getByRole('button', { name: 'Update' }).click();

	await expect(async () => {
		await page.goto('/admin/template/emails');
		await expect(resetForm().locator('input[name="subject"]')).toHaveValue(SUBJECT, {
			timeout: 1000
		});
	}).toPass();
});
