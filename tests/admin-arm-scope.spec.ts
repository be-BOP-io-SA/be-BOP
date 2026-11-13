import { expect, test, type BrowserContext, type Locator } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';
import { createHash, randomUUID } from 'node:crypto';

const E2E_DB = 'bebop-e2e';
const MANAGER_ROLE = 'e2e-arm-manager';
const ARM_ONLY_ROLE = 'e2e-arm-only';
const SEO_FENCED_ROLE = 'e2e-arm-seo-fenced';
const SEO_PAGE_ROLE = 'e2e-arm-seo-page';
const MANAGER_LOGIN = 'e2e-arm-manager';
const SEO_FENCED_LOGIN = 'e2e-arm-seo-fenced';
const ARM_ONLY_LOGIN = 'e2e-arm-only';
const STAFF_LOGIN = 'e2e-arm-staff';

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
		const users = await db
			.collection('users')
			.find({
				login: {
					$in: [MANAGER_LOGIN, ARM_ONLY_LOGIN, SEO_FENCED_LOGIN, STAFF_LOGIN]
				}
			})
			.toArray();
		await db.collection('sessions').deleteMany({ userId: { $in: users.map((u) => u._id) } });
		await db.collection('users').deleteMany({ _id: { $in: users.map((u) => u._id) } });
		await db.collection('roles').deleteMany({
			_id: {
				$in: [MANAGER_ROLE, ARM_ONLY_ROLE, SEO_FENCED_ROLE, SEO_PAGE_ROLE] as never[]
			}
		});
	});
}

async function seedUser(login: string, roleId: string, hasPosOptions = false) {
	const _id = new ObjectId();
	await withDb((db) =>
		db.collection('users').insertOne({
			_id,
			login,
			roleId,
			hasPosOptions,
			recovery: { email: `${login}@example.com` },
			createdAt: new Date(),
			updatedAt: new Date()
		})
	);
	return _id;
}

/** Signs a context in as `userId` without the login form, which allows ten attempts per run. */
async function signIn(context: BrowserContext, userId: ObjectId) {
	const token = randomUUID();
	await withDb((db) =>
		db.collection('sessions').insertOne({
			_id: new ObjectId(),
			sessionId: createHash('sha256').update(token).digest('hex'),
			userId,
			createdAt: new Date(),
			updatedAt: new Date(),
			expiresAt: new Date(Date.now() + 3600_000)
		})
	);
	await context.clearCookies();
	await context.addCookies([
		{ name: 'bootik-session', value: token, url: 'http://localhost:5012' }
	]);
}

/** Playwright 1.32 does not see a disabled `<option>` as disabled, so read the property. */
function offeredRoles(select: Locator) {
	return select
		.locator('option')
		.evaluateAll((options) =>
			(options as HTMLOptionElement[]).filter((o) => !o.disabled).map((o) => o.value)
		);
}

const role = (
	_id: string,
	name: string,
	write: string[],
	hasPosOptions = false,
	forbidden: string[] = []
) => ({
	_id,
	name,
	hasPosOptions,
	permissions: { read: [], write, forbidden },
	createdAt: new Date(),
	updatedAt: new Date()
});

let managerId: ObjectId;
let armOnlyId: ObjectId;
let seoFencedId: ObjectId;
let staffId: ObjectId;

test.beforeAll(async () => {
	await cleanUp();
	await withDb((db) =>
		db
			.collection('roles')
			.insertMany([
				role(MANAGER_ROLE, 'E2E manager', ['/admin/*']),
				role(ARM_ONLY_ROLE, 'E2E ARM only', ['/admin/arm/*']),
				role(SEO_FENCED_ROLE, 'E2E SEO fenced', ['/admin/*'], false, ['/admin/seo/advanced/*']),
				role(SEO_PAGE_ROLE, 'E2E SEO page', ['/admin/seo'])
			] as never[])
	);
	managerId = await seedUser(MANAGER_LOGIN, MANAGER_ROLE);
	seoFencedId = await seedUser(SEO_FENCED_LOGIN, SEO_FENCED_ROLE);
	armOnlyId = await seedUser(ARM_ONLY_LOGIN, ARM_ONLY_ROLE);
	staffId = await seedUser(STAFF_LOGIN, 'ticket-checker');
});

test.afterAll(cleanUp);

test('the role error names each allowed role once', async ({ page, context }) => {
	await signIn(context, managerId);
	const response = await page.request.post(`/admin/arm/user/${staffId}?/update`, {
		form: {
			login: STAFF_LOGIN,
			recoveryEmail: `${STAFF_LOGIN}@example.com`,
			roleId: 'point-of-sale',
			status: 'enabled'
		},
		headers: { origin: 'http://localhost:5012' }
	});

	expect(response.status()).toBe(422);
	const body = await response.text();
	expect(body.match(/ticket-checker/g)).toHaveLength(1);
});

test('a manager limited to user accounts is offered only their own role', async ({
	page,
	context
}) => {
	await signIn(context, armOnlyId);
	await page.goto('/admin/arm');

	await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Create a role' })).toHaveCount(0);
	await expect(
		page.locator(`form[action$="/arm/role/ticket-checker?/update"] button[title="Save"]`)
	).toBeDisabled();
	await expect(
		page.locator(`form[action$="/arm/user/${staffId}?/update"] button[title="Save"]`)
	).toBeDisabled();
	const ownRow = page.locator(`form[action$="/arm/user/${armOnlyId}?/update"]`);
	await expect(ownRow.locator('select[name="roleId"]')).toBeDisabled();

	await page.getByRole('link', { name: 'Create a user' }).click();
	await expect(page.getByRole('heading', { name: 'Create a user' })).toBeVisible();
	expect(await offeredRoles(page.locator('select[name="roleId"]'))).toEqual([ARM_ONLY_ROLE]);
});

test('a manager with a forbidden subpage can open the page next to a role naming one page', async ({
	page,
	context
}) => {
	await signIn(context, seoFencedId);
	const response = await page.goto('/admin/arm/user/new');

	expect(response?.status()).toBe(200);
	expect(await offeredRoles(page.locator('select[name="roleId"]'))).toEqual(
		expect.arrayContaining([SEO_FENCED_ROLE, SEO_PAGE_ROLE])
	);
});
