import { expect, test } from '@playwright/test';
import { MongoClient, ObjectId } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const TAB_SLUG = 'e2e-discount-tags';
const TAG_IDS = ['e2e-tag-hot-drinks', 'e2e-tag-desserts'];
const POS_SESSION_ID = new ObjectId();
const PRODUCT_ID = 'e2e-pos-coffee';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

function printTag(_id: string, name: string) {
	return {
		_id,
		name,
		title: name,
		subtitle: '',
		content: '',
		shortContent: '',
		cta: [],
		menu: [],
		widgetUseOnly: false,
		productTagging: true,
		useLightDark: false,
		reportingFilter: false,
		printReceiptFilter: true,
		cssOveride: '',
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

test.beforeAll(async () => {
	await withDb(async (db) => {
		// /pos is only open to accounts with point-of-sale options.
		await db
			.collection('users')
			.updateOne({ login: 'e2e-admin' }, { $set: { hasPosOptions: true } });
		// /pos/touch also requires an open till session.
		const admin = await db.collection('users').findOne({ login: 'e2e-admin' });
		await db.collection('posSessions').insertOne({
			_id: POS_SESSION_ID,
			status: 'active',
			openedAt: new Date(),
			openedBy: { userId: admin?._id, userLogin: 'e2e-admin' },
			cashOpening: { amount: 0, currency: 'EUR' },
			dailyIncomes: [],
			dailyOutcomes: [],
			xTickets: [],
			createdAt: new Date(),
			updatedAt: new Date()
		});
		// The discount button only works on a tab holding at least one item.
		await db.collection('products').replaceOne(
			{ _id: PRODUCT_ID as never },
			{
				name: 'E2E coffee',
				alias: [PRODUCT_ID],
				description: '',
				shortDescription: '',
				type: 'resource',
				price: { amount: 3, currency: 'EUR' },
				shipping: false,
				preorder: false,
				free: false,
				standalone: false,
				isTicket: false,
				displayShortDescription: false,
				payWhatYouWant: false,
				hideDiscountExpiration: false,
				tagIds: [TAG_IDS[0]],
				actionSettings: {
					eShop: { visible: true, canBeAddedToBasket: true },
					retail: { visible: true, canBeAddedToBasket: true },
					googleShopping: { visible: true },
					nostr: { visible: true, canBeAddedToBasket: true }
				},
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
		// The till drops tab items whose product has no picture.
		await db.collection('pictures').replaceOne(
			{ _id: `${PRODUCT_ID}-picture` as never },
			{
				name: PRODUCT_ID,
				productId: PRODUCT_ID,
				storage: {
					original: { key: 'e2e.png', width: 800, height: 800, size: 1 },
					formats: [{ key: 'e2e-800.webp', width: 800, height: 800, size: 1 }]
				},
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
		await db.collection('orderTabs').insertOne({
			_id: new ObjectId(),
			slug: TAB_SLUG,
			items: [{ _id: new ObjectId(), productId: PRODUCT_ID, quantity: 1 }],
			createdAt: new Date(),
			updatedAt: new Date()
		});
		await db
			.collection('tags')
			.insertMany([
				printTag(TAG_IDS[0], 'Boissons chaudes et viennoiseries'),
				printTag(TAG_IDS[1], 'Desserts maison du jour')
			] as never[]);
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		await db
			.collection('users')
			.updateOne({ login: 'e2e-admin' }, { $unset: { hasPosOptions: '' } });
		await db.collection('tags').deleteMany({ _id: { $in: TAG_IDS as never[] } });
		await db.collection('orderTabs').deleteMany({ slug: TAB_SLUG });
		await db.collection('posSessions').deleteOne({ _id: POS_SESSION_ID });
		await db.collection('products').deleteOne({ _id: PRODUCT_ID as never });
		await db.collection('pictures').deleteOne({ _id: `${PRODUCT_ID}-picture` as never });
	});
});

test.use({ viewport: { width: 390, height: 844 } });

test('on mobile, discount tag buttons fit and Save sits next to Return', async ({ page }) => {
	// The till keeps an SSE stream open, so the network never goes idle.
	await page.goto(`/pos/touch/tab/${TAB_SLUG}`);
	const discountButton = page.getByRole('button', { name: '%', exact: true });
	await expect(discountButton).toBeEnabled();
	await page.waitForLoadState('load');
	await discountButton.click();

	for (const name of ['Boissons chaudes et viennoiseries', 'Desserts maison du jour']) {
		const button = page.getByRole('button', { name, exact: true });
		await expect(button).toBeVisible();
		const overflows = await button.evaluate((el) => el.scrollWidth > el.clientWidth);
		expect(overflows, `${name} overflows its button`).toBe(false);
	}

	const back = await page.getByRole('button', { name: 'Return' }).boundingBox();
	const save = await page.getByRole('button', { name: 'Save' }).boundingBox();
	expect(back && save).toBeTruthy();
	expect(Math.abs((back?.y ?? 0) - (save?.y ?? 0))).toBeLessThan(5);
	expect(back?.x ?? 0).toBeLessThan(save?.x ?? 0);
});
