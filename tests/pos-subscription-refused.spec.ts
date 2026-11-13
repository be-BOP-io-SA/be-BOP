import { expect, test, type Page } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const TAB_SLUG = 'e2e-subscription-tab';
const POS_SESSION_ID = new ObjectId();
const GIFT_ID = 'e2e-till-gift-card';
const SUBSCRIPTION_ID = 'e2e-till-subscription';
const REFUSED = {
	en: 'Subscriptions are not sold at the till: the customer subscribes from the product page.',
	fr: "Les abonnements ne se vendent pas en caisse : le client s'abonne depuis la page du produit."
};

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

function product(_id: string, name: string, type: 'resource' | 'subscription') {
	return {
		name,
		alias: [_id],
		description: '',
		shortDescription: '',
		type,
		price: { amount: 10, currency: 'EUR' },
		shipping: false,
		preorder: false,
		free: false,
		standalone: false,
		isTicket: false,
		displayShortDescription: false,
		payWhatYouWant: false,
		hideDiscountExpiration: false,
		actionSettings: {
			eShop: { visible: true, canBeAddedToBasket: true },
			retail: { visible: true, canBeAddedToBasket: true },
			googleShopping: { visible: true },
			nostr: { visible: true, canBeAddedToBasket: true }
		},
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

let adminId: ObjectId;

const countOrdersAndCarts = () =>
	withDb(async (db) => ({
		orders: await db.collection('orders').countDocuments({ 'user.userId': adminId }),
		carts: await db.collection('carts').countDocuments({ orderTabSlug: TAB_SLUG })
	}));

test.beforeAll(async () => {
	await withDb(async (db) => {
		// /pos is only open to accounts with point-of-sale options.
		await db
			.collection('users')
			.updateOne({ login: 'e2e-admin' }, { $set: { hasPosOptions: true } });
		const admin = await db.collection('users').findOne({ login: 'e2e-admin' });
		adminId = admin?._id as ObjectId;
		// /pos/touch also requires an open till session.
		await db.collection('posSessions').insertOne({
			_id: POS_SESSION_ID,
			status: 'active',
			openedAt: new Date(),
			openedBy: { userId: adminId, userLogin: 'e2e-admin' },
			cashOpening: { amount: 0, currency: 'EUR' },
			dailyIncomes: [],
			dailyOutcomes: [],
			xTickets: [],
			createdAt: new Date(),
			updatedAt: new Date()
		});
		for (const [id, name, type] of [
			[GIFT_ID, 'E2E till gift card', 'resource'],
			[SUBSCRIPTION_ID, 'E2E till subscription', 'subscription']
		] as const) {
			await db
				.collection('products')
				.replaceOne({ _id: id as never }, product(id, name, type), { upsert: true });
		}
	});
});

test.beforeEach(async () => {
	await withDb(async (db) => {
		await db.collection('carts').deleteMany({ 'user.userId': adminId });
		await db.collection('orderTabs').replaceOne(
			{ slug: TAB_SLUG },
			{
				slug: TAB_SLUG,
				items: [
					{ _id: new ObjectId(), productId: GIFT_ID, quantity: 1 },
					{ _id: new ObjectId(), productId: SUBSCRIPTION_ID, quantity: 1 }
				],
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		await db
			.collection('users')
			.updateOne({ login: 'e2e-admin' }, { $unset: { hasPosOptions: '' } });
		await db.collection('orderTabs').deleteMany({ slug: TAB_SLUG });
		await db.collection('carts').deleteMany({ 'user.userId': adminId });
		await db.collection('posSessions').deleteOne({ _id: POS_SESSION_ID });
		await db
			.collection('products')
			.deleteMany({ _id: { $in: [GIFT_ID, SUBSCRIPTION_ID] as never[] } });
	});
});

async function payTabAtTouchTill(page: Page, labels: { cashIn: RegExp; payRemaining: RegExp }) {
	// The till keeps an SSE stream open, so the network never goes idle.
	await page.goto(`/pos/touch/tab/${TAB_SLUG}/split`);
	await page.waitForLoadState('load');
	await expect(async () => {
		await page.getByRole('button', { name: labels.cashIn }).click({ timeout: 1000 });
		await expect(page.getByRole('button', { name: labels.payRemaining })).toBeVisible({
			timeout: 1000
		});
	}).toPass({ timeout: 20000 });
	await page.getByRole('button', { name: labels.payRemaining }).click();
}

test('the touch till says why a tab holding a subscription is not paid', async ({ page }) => {
	const before = await countOrdersAndCarts();
	await payTabAtTouchTill(page, { cashIn: /Cash in/, payRemaining: /Pay Remaining/ });
	await expect(page.locator('.alert-error')).toContainText(REFUSED.en);
	expect(await countOrdersAndCarts()).toEqual(before);
});

test('the till checkout says why a cart holding a subscription is not ordered', async ({
	page
}) => {
	await withDb((db) =>
		db.collection('carts').insertOne({
			_id: new ObjectId(),
			user: { userId: adminId },
			items: [
				{ productId: GIFT_ID, quantity: 1 },
				{ productId: SUBSCRIPTION_ID, quantity: 1 }
			],
			createdAt: new Date(),
			updatedAt: new Date()
		})
	);
	const before = await countOrdersAndCarts();
	await page.goto('/checkout');
	await expect(async () => {
		await page
			.locator('select[name="paymentMethod"]')
			.selectOption('point-of-sale', { timeout: 1000 });
		await page.locator('input[name="teecees"]').check({ timeout: 1000 });
	}).toPass({ timeout: 20000 });
	await page.locator('input[type="submit"][form="checkout"]').click();
	await expect(page.locator('.alert-error')).toContainText(REFUSED.en);
	expect(await countOrdersAndCarts()).toEqual(before);
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the touch till says why a tab holding a subscription is not paid', async ({ page }) => {
		await payTabAtTouchTill(page, { cashIn: /Encaisser/, payRemaining: /Payer le reste/ });
		await expect(page.locator('.alert-error')).toContainText(REFUSED.fr);
	});
});
