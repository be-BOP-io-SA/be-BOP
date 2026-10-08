import { expect, test, type Page } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const URL_PRODUCT = 'e2e-variation-from-url';
const HIDDEN_FAMILY_PRODUCT = 'e2e-variation-hidden-family';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

function braceletWithColors(_id: string, extra: Record<string, unknown> = {}) {
	return {
		name: `E2E ${_id}`,
		alias: [_id],
		description: 'Seeded by the e2e suite',
		shortDescription: 'Variations',
		type: 'resource',
		price: { amount: 10, currency: 'EUR' },
		shipping: false,
		preorder: false,
		free: false,
		// The variation dropdowns are only rendered for standalone products.
		standalone: true,
		isTicket: false,
		displayShortDescription: true,
		payWhatYouWant: false,
		hideDiscountExpiration: false,
		hasVariations: true,
		variations: [
			{ name: 'color', value: 'red', price: 0 },
			{ name: 'color', value: 'blue', price: 0 }
		],
		variationLabels: { names: { color: 'Color' }, values: { color: { red: 'Red', blue: 'Blue' } } },
		actionSettings: {
			eShop: { visible: true, canBeAddedToBasket: true },
			retail: { visible: true, canBeAddedToBasket: true },
			googleShopping: { visible: true },
			nostr: { visible: true, canBeAddedToBasket: true }
		},
		createdAt: new Date(),
		updatedAt: new Date(),
		...extra
	};
}

const chosenColor = (page: Page) => page.locator('[name="chosenVariations[color]"]');

test.beforeAll(async () => {
	await withDb(async (db) => {
		const products = db.collection('products');
		await products.replaceOne({ _id: URL_PRODUCT as never }, braceletWithColors(URL_PRODUCT), {
			upsert: true
		});
		await products.replaceOne(
			{ _id: HIDDEN_FAMILY_PRODUCT as never },
			braceletWithColors(HIDDEN_FAMILY_PRODUCT, {
				variationFamilies: { color: { hiddenFromUI: true } },
				variationUrlPolicy: 'ignore'
			}),
			{ upsert: true }
		);
		// The product page needs a picture until #2639's fix is merged.
		for (const productId of [URL_PRODUCT, HIDDEN_FAMILY_PRODUCT]) {
			await db.collection('pictures').replaceOne(
				{ _id: `${productId}-picture` as never },
				{
					name: productId,
					productId,
					storage: {
						original: { key: 'e2e.png', width: 800, height: 800, size: 1 },
						formats: [{ key: 'e2e-800.webp', width: 800, height: 800, size: 1 }]
					},
					createdAt: new Date(),
					updatedAt: new Date()
				},
				{ upsert: true }
			);
		}
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		const ids = [URL_PRODUCT, HIDDEN_FAMILY_PRODUCT];
		await db.collection('products').deleteMany({ _id: { $in: ids as never[] } });
		await db.collection('pictures').deleteMany({ productId: { $in: ids } });
	});
});

test('a variation chosen by the URL follows in-app navigation to another link', async ({
	page
}) => {
	await page.goto(`/product/${URL_PRODUCT}?color=red`);
	await expect(chosenColor(page)).toHaveValue('red');

	// An in-app link: SvelteKit navigates on the client and keeps the page component.
	await page.evaluate((href) => {
		const link = document.createElement('a');
		link.href = href;
		link.id = 'e2e-other-variation';
		link.textContent = 'Blue';
		document.body.append(link);
	}, `/product/${URL_PRODUCT}?color=blue`);
	await page.locator('#e2e-other-variation').click();

	await expect(page).toHaveURL(/color=blue$/);
	await expect(chosenColor(page)).toHaveValue('blue');
});

test('a family hidden from the page gets its dropdown back when the URL leaves it unset under the "ignore" policy', async ({
	page
}) => {
	const response = await page.goto(`/product/${HIDDEN_FAMILY_PRODUCT}`);

	expect(response?.status()).toBe(200);
	await expect(page.locator('select[name="chosenVariations[color]"]')).toBeVisible();
});
