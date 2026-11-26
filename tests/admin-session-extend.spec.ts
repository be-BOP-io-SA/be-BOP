import { expect, test, type BrowserContext } from './client-ip.js';
import { MongoClient, ObjectId } from 'mongodb';
import { createHash, randomUUID } from 'node:crypto';

const E2E_DB = 'bebop-e2e';
// A back-office role that may not write anywhere near `/admin/session`: extending used to answer
// 403 to every role but Super Admin.
const ROLE_ID = 'e2e-session-extend';
const LOGIN = 'e2e-session-extend';

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
		const users = await db.collection('users').find({ login: LOGIN }).toArray();
		await db.collection('sessions').deleteMany({ userId: { $in: users.map((u) => u._id) } });
		await db.collection('users').deleteMany({ _id: { $in: users.map((u) => u._id) } });
		await db.collection('roles').deleteMany({ _id: ROLE_ID as never });
	});
}

/** Signs a context in with a session that ends at `expireUserAt`, without the login form. */
async function signIn(context: BrowserContext, userId: ObjectId, expireUserAt: Date) {
	const token = randomUUID();
	const sessionId = createHash('sha256').update(token).digest('hex');
	await withDb((db) =>
		db.collection('sessions').insertOne({
			_id: new ObjectId(),
			sessionId,
			userId,
			createdAt: new Date(),
			updatedAt: new Date(),
			expiresAt: new Date(Date.now() + 3600_000),
			expireUserAt
		})
	);
	await context.clearCookies();
	await context.addCookies([
		{ name: 'bootik-session', value: token, url: 'http://localhost:5012' }
	]);
	return sessionId;
}

let userId: ObjectId;

test.beforeAll(async () => {
	await cleanUp();
	await withDb(async (db) => {
		await db.collection('roles').insertOne({
			_id: ROLE_ID as never,
			name: 'E2E session extend',
			hasPosOptions: false,
			permissions: { read: [], write: ['/admin/arm/*'], forbidden: [] },
			createdAt: new Date(),
			updatedAt: new Date()
		});
		userId = new ObjectId();
		await db.collection('users').insertOne({
			_id: userId,
			login: LOGIN,
			roleId: ROLE_ID,
			hasPosOptions: false,
			recovery: { email: `${LOGIN}@example.com` },
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});
});

test.afterAll(cleanUp);

test('a back-office role other than Super Admin extends its session from the banner', async ({
	page,
	context
}) => {
	const expireUserAt = new Date(Date.now() + 2 * 60_000);
	const sessionId = await signIn(context, userId, expireUserAt);
	const extended = expireUserAt.getTime() + 30 * 60_000;
	const extend = page.getByRole('button', { name: 'Extend' });
	const endOfSession = async () => {
		const session = await withDb((db) => db.collection('sessions').findOne({ sessionId }));
		return session?.expireUserAt?.getTime();
	};

	// A click before the page hydrates does nothing, so reload until one goes through.
	await expect(async () => {
		if ((await endOfSession()) !== extended) {
			await page.goto('/admin/arm');
			await extend.click({ timeout: 1000 });
		}
		await expect.poll(endOfSession, { timeout: 2000 }).toBe(extended);
	}).toPass();

	await expect(extend).toBeHidden();
	await expect(page.getByText('The session could not be extended')).toBeHidden();
});
