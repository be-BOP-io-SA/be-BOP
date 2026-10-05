import { expect, test, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const ID_PREFIX = 'e2e-reporting-totals-';
// A period nothing else in the e2e database falls into.
const PERIOD = 'beginsAt=2001-01-01T00:00:00.000Z&endsAt=2001-01-31T23:59:00.000Z';
const createdAt = new Date('2001-01-15T12:00:00.000Z');

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

function seededOrder(suffix: string, status: 'paid' | 'pending', amount: number) {
	const price = { amount, currency: 'EUR' };
	return {
		_id: ID_PREFIX + suffix,
		number: 900_000 + amount,
		locale: 'en',
		status,
		createdAt,
		updatedAt: createdAt,
		user: {},
		items: [
			{
				_id: new ObjectId(),
				product: { _id: `${ID_PREFIX}product`, name: 'E2E reporting product', tagIds: [] },
				quantity: 1,
				vatRate: 20,
				currencySnapshot: { main: { price }, priceReference: { price } }
			}
		],
		payments: [
			{
				_id: new ObjectId(),
				status,
				method: 'bank-transfer',
				price,
				currencySnapshot: { main: { price }, priceReference: { price } },
				createdAt,
				...(status === 'paid' && { paidAt: createdAt })
			}
		],
		currencySnapshot: {
			main: { totalPrice: price, vat: [{ amount: amount / 6, currency: 'EUR' }] },
			priceReference: { totalPrice: price }
		}
	};
}

test.beforeAll(async () => {
	await withDb(async (db) => {
		await db.collection('orders').deleteMany({ _id: { $regex: `^${ID_PREFIX}` } as never });
		await db
			.collection('orders')
			.insertMany([
				seededOrder('paid', 'paid', 10),
				seededOrder('pending', 'pending', 500)
			] as never);
	});
});

test.afterAll(async () => {
	await withDb((db) =>
		db.collection('orders').deleteMany({ _id: { $regex: `^${ID_PREFIX}` } as never })
	);
});

// Order quantity and total of a synthesis table, located by a header only it has.
async function synthesis(page: Page, totalHeader: string) {
	const cells = page
		.locator('table', { has: page.locator('th', { hasText: totalHeader }) })
		.first()
		.locator('tbody tr')
		.first()
		.locator('td');
	return { quantity: await cells.nth(1).innerText(), total: await cells.nth(2).innerText() };
}

test('searching pending orders lists them without adding them to the totals', async ({ page }) => {
	await page.goto(`/admin/reporting?${PERIOD}`);
	const paidOnly = {
		order: await synthesis(page, 'order Total'),
		vat: await synthesis(page, 'VAT Total')
	};
	expect(paidOnly.order.quantity).toBe('1');

	await page.goto(`/admin/reporting?${PERIOD}&orderStatus=paid&orderStatus=pending`);

	// The pending order is in the order detail...
	await expect(page.getByText('2 rows', { exact: true }).first()).toBeVisible();
	// ...but the totals still count only what was paid.
	expect(await synthesis(page, 'order Total')).toEqual(paidOnly.order);
	expect(await synthesis(page, 'VAT Total')).toEqual(paidOnly.vat);
});
