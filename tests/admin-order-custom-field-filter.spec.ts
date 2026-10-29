import { expect, test, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const ID_PREFIX = 'e2e-custom-field-filter-';
const SIZE = { slug: `${ID_PREFIX}size`, name: 'E2E size', type: 'options' as const };
const TEAM = { slug: `${ID_PREFIX}team`, name: 'E2E team', type: 'free' as const };
const GIFT = { slug: `${ID_PREFIX}gift`, name: 'E2E gift address', type: 'address' as const };

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

function seededOrder(suffix: string, number: number, size: string, team: string) {
	const createdAt = new Date();
	const price = { amount: 10, currency: 'EUR' };
	const answer = (field: typeof SIZE | typeof TEAM, value: string) => ({
		fieldId: field.slug,
		slug: field.slug,
		name: field.name,
		label: field.name,
		type: field.type,
		value
	});
	return {
		_id: ID_PREFIX + suffix,
		number,
		locale: 'en',
		status: 'paid',
		createdAt,
		updatedAt: createdAt,
		user: {},
		items: [],
		payments: [
			{
				_id: new ObjectId(),
				status: 'paid',
				method: 'bank-transfer',
				price,
				currencySnapshot: { main: { price }, priceReference: { price } },
				createdAt,
				paidAt: createdAt
			}
		],
		currencySnapshot: { main: { totalPrice: price }, priceReference: { totalPrice: price } },
		customCheckoutFields: [answer(SIZE, size), answer(TEAM, team)]
	};
}

const SMALL_RED = seededOrder('small-red', 960_001, 'S', 'Red');
const MEDIUM_RED = seededOrder('medium-red', 960_002, 'M', 'Red');
const SMALL_BLUE = seededOrder('small-blue', 960_003, 'S', 'Blue');

async function cleanUp() {
	await withDb(async (db) => {
		await db.collection('orders').deleteMany({ _id: { $regex: `^${ID_PREFIX}` } as never });
		await db.collection('checkoutFieldConfigs').deleteMany({ slug: { $regex: `^${ID_PREFIX}` } });
	});
}

test.beforeAll(async () => {
	await cleanUp();
	await withDb(async (db) => {
		// Disabled, so other specs never see them at checkout; the filter still offers them.
		await db.collection('checkoutFieldConfigs').insertMany(
			[SIZE, TEAM, GIFT].map((field, index) => ({
				_id: new ObjectId(),
				...field,
				label: field.name,
				...(field.type === 'options' && { options: ['S', 'M'] }),
				disabled: true,
				sortOrder: 9_000 + index,
				createdAt: new Date(),
				updatedAt: new Date()
			}))
		);
		await db.collection('orders').insertMany([SMALL_RED, MEDIUM_RED, SMALL_BLUE] as never);
	});
});

test.afterAll(cleanUp);

async function filterOn(page: Page, rows: Array<{ slug: string; value: string }>) {
	await page.goto('/admin/order');
	for (const [index, row] of rows.entries()) {
		await page.getByRole('button', { name: 'Add a checkout field filter' }).click();
		await page.locator(`select[name="customFields[${index}].slug"]`).selectOption(row.slug);
		await page.locator(`input[name="customFields[${index}].value"]`).fill(row.value);
	}
	await page.locator('input[type="submit"][value="🔍"]').click();
	await expect(page).toHaveURL(/customFields/);
}

function orderLink(page: Page, order: { _id: string }) {
	return page.locator(`a[href="/order/${order._id}"]`);
}

test('one row lists the orders carrying that answer', async ({ page }) => {
	await filterOn(page, [{ slug: SIZE.slug, value: 'S' }]);

	await expect(orderLink(page, SMALL_RED)).toBeVisible();
	await expect(orderLink(page, SMALL_BLUE)).toBeVisible();
	await expect(orderLink(page, MEDIUM_RED)).toHaveCount(0);
});

test('two rows list the orders carrying both answers, whatever the case', async ({ page }) => {
	await filterOn(page, [
		{ slug: SIZE.slug, value: 's' },
		{ slug: TEAM.slug, value: 'red' }
	]);

	await expect(orderLink(page, SMALL_RED)).toBeVisible();
	await expect(orderLink(page, SMALL_BLUE)).toHaveCount(0);
	await expect(orderLink(page, MEDIUM_RED)).toHaveCount(0);
});

test('Address fields are not offered', async ({ page }) => {
	await page.goto('/admin/order');
	await page.getByRole('button', { name: 'Add a checkout field filter' }).click();
	const options = page.locator('select[name="customFields[0].slug"] option');

	await expect(options.filter({ hasText: SIZE.name })).toHaveCount(1);
	await expect(options.filter({ hasText: GIFT.name })).toHaveCount(0);
});
