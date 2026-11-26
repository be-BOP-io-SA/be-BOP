import { expect, test, type Page } from './client-ip.js';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const PRODUCT_ID = 'e2e-checkout-no-contact';
const COUNTER = {
	id: 'e2e-counter',
	label: 'E2E cash at the counter',
	instructions: '',
	allowOrderWithoutContactAddress: true
};
const CHEQUE = { id: 'e2e-cheque', label: 'E2E cheque', instructions: '' };
const CONFIG = {
	customPaymentMethods: [COUNTER, CHEQUE],
	contactModes: ['email'],
	contactModesForceOption: true
};

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

let savedConfig: Array<{ _id: string; data: unknown }> = [];

test.beforeAll(async () => {
	await withDb(async (db) => {
		const config = db.collection<{ _id: string; data: unknown }>('runtimeConfig');
		savedConfig = await config.find({ _id: { $in: Object.keys(CONFIG) } }).toArray();
		for (const [_id, data] of Object.entries(CONFIG)) {
			await config.updateOne({ _id }, { $set: { data, updatedAt: new Date() } }, { upsert: true });
		}
		await db.collection('products').replaceOne(
			{ _id: PRODUCT_ID as never },
			{
				name: 'E2E checkout without contact',
				alias: [PRODUCT_ID],
				description: '',
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
				allowOrderWithoutContactAddress: true,
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
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		const config = db.collection<{ _id: string; data: unknown }>('runtimeConfig');
		for (const key of Object.keys(CONFIG)) {
			const saved = savedConfig.find((item) => item._id === key);
			if (saved) {
				await config.replaceOne({ _id: key }, saved);
			} else {
				await config.deleteOne({ _id: key });
			}
		}
		await db.collection('products').deleteOne({ _id: PRODUCT_ID as never });
	});
});

async function openCheckout(page: Page) {
	await page.goto('/');
	const origin = new URL(page.url()).origin;
	const response = await page.request.post(`/product/${PRODUCT_ID}?/addToCart`, {
		form: { quantity: '1' },
		// SvelteKit 2 answers a form post that accepts anything as a fetch, with JSON instead of a redirect.
		headers: { origin, accept: 'text/html' },
		maxRedirects: 0
	});
	expect(response.status()).toBe(303);

	// The server reads the settings back through a change stream, so they apply on a later page.
	await expect(async () => {
		await page.goto('/checkout');
		await expect(
			page.locator(`select[name="paymentMethod"] option[value="custom:${COUNTER.id}"]`)
		).toHaveCount(1, { timeout: 1000 });
	}).toPass();

	// The page's JavaScript has run once the server-side pattern is gone.
	await expect(page.locator('input[name="paymentStatusAddress"]')).not.toHaveAttribute(
		'pattern',
		/./
	);
}

async function expectContact(page: Page, expected: { optional: boolean; mark: string }) {
	const field = page.locator('input[name="paymentStatusAddress"]');
	const label = page.locator('label', { has: field });

	if (expected.optional) {
		await expect(label).toContainText(expected.mark);
		await expect(field).not.toHaveAttribute('required', '');
	} else {
		await expect(label).not.toContainText(expected.mark);
		await expect(field).toHaveAttribute('required', '');
	}
}

// A visitor, not the signed-in administrator, who has point-of-sale options.
test.use({ storageState: { cookies: [], origins: [] } });

test('the contact is optional only with a payment method that allows it', async ({ page }) => {
	await openCheckout(page);
	const method = page.locator('select[name="paymentMethod"]');

	await method.selectOption(`custom:${COUNTER.id}`);
	await expectContact(page, { optional: true, mark: '(optional)' });
	await expect(page.getByText('You may fill in a contact address')).toBeVisible();

	await method.selectOption(`custom:${CHEQUE.id}`);
	await expectContact(page, { optional: false, mark: '(optional)' });
	await expect(page.getByText('Please fill in a contact address')).toBeVisible();
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the optional contact is announced as such', async ({ page }) => {
		await openCheckout(page);
		await page.locator('select[name="paymentMethod"]').selectOption(`custom:${COUNTER.id}`);

		await expectContact(page, { optional: true, mark: '(facultatif)' });
		await expect(page.getByText('Vous pouvez remplir une adresse de contact')).toBeVisible();
	});
});
