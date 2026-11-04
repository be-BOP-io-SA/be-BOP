import { expect, test, type Page } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const PRODUCT_ID = 'e2e-notification-address';
const SCHEDULE_ID = 'e2e-notification-address';

// Encoding of 32 bytes of 0x07: a valid npub, not anybody's.
const NPUB = 'npub1qurswpc8qurswpc8qurswpc8qurswpc8qurswpc8qurswpc8qursnvjvl7';

const CONFIG_KEYS = ['contactModes', 'contactModesForceOption'];

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

/** The server reads these settings back through a change stream, so they apply on the next page */
async function setContactModes(modes: string[], forceOption: boolean) {
	await withDb(async (db) => {
		const config = db.collection('runtimeConfig');
		for (const [_id, data] of [
			['contactModes', modes],
			['contactModesForceOption', forceOption]
		] as const) {
			await config.updateOne(
				{ _id: _id as never },
				{ $set: { data, updatedAt: new Date() } },
				{ upsert: true }
			);
		}
	});
}

async function addProductToCart(page: Page) {
	await page.goto('/');
	const origin = new URL(page.url()).origin;
	const response = await page.request.post(`/product/${PRODUCT_ID}?/addToCart`, {
		form: { quantity: '1' },
		headers: { origin },
		maxRedirects: 0
	});
	expect(response.status()).toBe(303);
}

let savedConfig: Array<{ _id: string; data: unknown }> = [];

test.beforeAll(async () => {
	await withDb(async (db) => {
		savedConfig = await db
			.collection<{ _id: string; data: unknown }>('runtimeConfig')
			.find({ _id: { $in: CONFIG_KEYS } })
			.toArray();
		await db.collection('products').replaceOne(
			{ _id: PRODUCT_ID as never },
			{
				name: 'E2E notification address',
				alias: [PRODUCT_ID],
				description: 'Seeded by the e2e suite',
				shortDescription: '',
				type: 'resource',
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
			},
			{ upsert: true }
		);
		await db.collection('schedules').replaceOne(
			{ _id: SCHEDULE_ID as never },
			{
				name: 'E2E notification address',
				pastEventDelay: 60,
				displayPastEvents: false,
				displayPastEventsAfterFuture: false,
				sortByEventDateDesc: false,
				allowSubscription: true,
				events: [],
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		const config = db.collection<{ _id: string; data: unknown }>('runtimeConfig');
		for (const key of CONFIG_KEYS) {
			const saved = savedConfig.find((item) => item._id === key);
			if (saved) {
				await config.replaceOne({ _id: key }, saved);
			} else {
				await config.deleteOne({ _id: key });
			}
		}
		await db.collection('products').deleteOne({ _id: PRODUCT_ID as never });
		await db.collection('schedules').deleteOne({ _id: SCHEDULE_ID as never });
	});
});

/**
 * For each shop setting: the label of the field, an address it accepts, and an address it
 * refuses with the message shown.
 *
 * "No mode available" relies on the e2e shop having neither SMTP nor an nsec configured, which
 * is the case of the committed `.env`.
 */
const CASES = [
	{
		name: 'email only',
		modes: ['email'],
		forceOption: true,
		label: 'Email',
		accepted: 'jane@example.com',
		refused: NPUB,
		message: 'Invalid email address'
	},
	{
		name: 'Nostr only',
		modes: ['nostr'],
		forceOption: true,
		label: 'Nostr public key',
		accepted: NPUB,
		refused: 'jane@example.com',
		message: 'Invalid Nostr npub address'
	},
	{
		name: 'email and Nostr',
		modes: ['email', 'nostr'],
		forceOption: true,
		label: 'Email or Nostr public key',
		accepted: NPUB,
		refused: 'jane',
		message: 'Your contact address is invalid (fill either a correct email address or a Nostr npub)'
	},
	{
		name: 'no mode available',
		modes: ['email', 'nostr'],
		forceOption: false,
		label: 'Email',
		accepted: 'jane@example.com',
		refused: NPUB,
		message: 'Invalid email address'
	}
];

/** Opens the page until the server serves it with the expected label, then checks the field */
async function checkField(page: Page, url: string, c: (typeof CASES)[number]) {
	const field = page.getByLabel(c.label, { exact: true });
	await expect(async () => {
		await page.goto(url);
		await expect(field).toBeVisible({ timeout: 1000 });
	}).toPass();

	// The message is set once the page's JavaScript runs.
	await field.fill(c.refused);
	await expect
		.poll(() => field.evaluate((input: HTMLInputElement) => input.validationMessage))
		.toBe(c.message);

	await field.fill(c.accepted);
	await expect
		.poll(() => field.evaluate((input: HTMLInputElement) => input.validationMessage))
		.toBe('');
}

test.describe('customer forms', () => {
	// A visitor, not the signed-in administrator, who has point-of-sale options.
	test.use({ storageState: { cookies: [], origins: [] } });

	for (const c of CASES) {
		test.describe(c.name, () => {
			test.beforeAll(() => setContactModes(c.modes, c.forceOption));

			test('login', async ({ page }) => {
				await checkField(page, '/login', c);
			});

			test('schedule subscription', async ({ page }) => {
				await checkField(page, `/schedule/${SCHEDULE_ID}/subscribe`, c);
			});

			test('checkout', async ({ page }) => {
				await addProductToCart(page);
				await checkField(page, '/checkout', c);
				await expect(page.getByLabel(c.label, { exact: true })).toHaveAttribute('required', '');
			});
		});
	}

	test('the server refuses a kind of address the shop does not offer', async ({ page }) => {
		await setContactModes(['email'], true);
		await page.goto('/login');
		const origin = new URL(page.url()).origin;

		const response = await page.request.post('/login?/sendLink', {
			form: { address: NPUB },
			headers: { origin }
		});

		expect(response.status()).toBe(400);
	});
});

test('a point-of-sale checkout does not require a contact address', async ({ page }) => {
	await setContactModes(['email', 'nostr'], true);
	await addProductToCart(page);
	const field = page.getByLabel('Email or Nostr public key', { exact: true });
	await expect(async () => {
		await page.goto('/checkout');
		await expect(field).toBeVisible({ timeout: 1000 });
	}).toPass();

	await expect(field).not.toHaveAttribute('required', '');
	await expect(field).toHaveValue('');
	await expect
		.poll(() => field.evaluate((input: HTMLInputElement) => input.validationMessage))
		.toBe('');
});
