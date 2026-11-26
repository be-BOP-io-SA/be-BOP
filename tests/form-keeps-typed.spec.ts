import { expect, test } from './client-ip.js';
import type { Page } from './client-ip.js';
import { withDb } from './pending-order.js';

/**
 * Most admin forms mix two kinds of fields: some store what is entered in the page's data
 * at once, the others only read their starting value from it. Filling one of the first kind
 * must leave alone what was just entered in the second kind, on a page loaded from the server.
 */

const SCHEDULE_ID = 'e2e-form-keeps-typed';
const PRODUCT_ID = 'e2e-form-keeps-typed-product';
const TAG_ID = 'e2e-form-keeps-typed-tag';

test.beforeAll(async () => {
	await withDb(async (db) => {
		await db.collection('schedules').replaceOne(
			{ _id: SCHEDULE_ID as never },
			{
				name: 'E2E schedule',
				pastEventDelay: 60,
				displayPastEvents: false,
				displayPastEventsAfterFuture: false,
				sortByEventDateDesc: false,
				events: [
					{
						title: 'Workshop',
						slug: 'workshop',
						beginsAt: new Date('2030-01-01T10:00:00Z'),
						endsAt: new Date('2030-01-01T12:00:00Z')
					}
				],
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
		await db.collection('products').replaceOne(
			{ _id: PRODUCT_ID as never },
			{
				name: 'E2E product',
				alias: [PRODUCT_ID, 'e2e-seeded-alias'],
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
				hideFromSEO: true,
				maxQuantityPerOrder: 5,
				stock: { total: 12, available: 12, reserved: 0 },
				cta: [{ label: 'Seeded button', href: 'https://example.com', fallback: false }],
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
		await db.collection('tags').replaceOne(
			{ _id: TAG_ID as never },
			{
				name: 'E2E tag',
				title: 'E2E tag',
				subtitle: '',
				content: '',
				shortContent: '',
				cta: [{ label: 'Seeded button', href: 'https://example.com', openNewTab: true }],
				menu: [],
				widgetUseOnly: false,
				productTagging: true,
				useLightDark: false,
				reportingFilter: false,
				printReceiptFilter: false,
				cssOveride: '',
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
	});
});

test.afterAll(async () => {
	await withDb(async (db) => {
		await db.collection('schedules').deleteOne({ _id: SCHEDULE_ID as never });
		await db.collection('products').deleteOne({ _id: PRODUCT_ID as never });
		await db.collection('tags').deleteOne({ _id: TAG_ID as never });
	});
});

// Sections of the longer forms are folded away until they are opened.
async function unfoldEverySection(page: Page) {
	await page.evaluate(() =>
		document.querySelectorAll('details').forEach((details) => (details.open = true))
	);
}

// None of these tests submits its form: nothing they type is saved.

test('the general settings keep what was typed and ticked when another box is ticked', async ({
	page
}) => {
	await page.goto('/admin/config', { waitUntil: 'networkidle' });
	const paymentTimeout = page.locator('input[name="desiredPaymentTimeout"]');
	// Ticked by default: a box the server rendered ticked is the one that used to come back.
	const priceHistory = page.locator('input[name="priceHistoryEnabled"]');
	await expect(priceHistory).toBeChecked();

	await paymentTimeout.fill('99');
	await priceHistory.uncheck();
	// This box stores its state in the page's data, which every other field reads from.
	await page.locator('input[name="displayVatIncludedInProduct"]').click();

	await expect(paymentTimeout).toHaveValue('99');
	await expect(priceHistory).not.toBeChecked();
});

test('an agenda keeps what was typed when one of its options is ticked', async ({ page }) => {
	await page.goto(`/admin/schedule/${SCHEDULE_ID}`, { waitUntil: 'networkidle' });
	await unfoldEverySection(page);
	const title = page.locator('input[name="events[0].title"]');
	const pastEventDelay = page.locator('input[name="pastEventDelay"]');

	await title.fill('Typed title');
	await pastEventDelay.fill('123');
	await page.locator('input[name="sortByEventDateDesc"]').click();

	await expect(title).toHaveValue('Typed title');
	await expect(pastEventDelay).toHaveValue('123');
});

test('a product keeps what was typed and ticked when one of its options is ticked', async ({
	page
}) => {
	await page.goto(`/admin/product/${PRODUCT_ID}`, { waitUntil: 'networkidle' });
	await unfoldEverySection(page);
	const alias = page.locator('input[name="alias"]');
	const stock = page.locator('input[name="stock"]');
	const maxQuantityPerOrder = page.locator('input[name="maxQuantityPerOrder"]');
	const buttonText = page.locator('input[name="cta[0].label"]');
	const hideFromSEO = page.locator('input[name="hideFromSEO"]');
	await expect(hideFromSEO).toBeChecked();

	await alias.fill('typed-alias');
	await stock.fill('77');
	await maxQuantityPerOrder.fill('9');
	await buttonText.fill('Typed button');
	await hideFromSEO.uncheck();
	await page.locator('input[name="displayShortDescription"]').click();

	await expect(alias).toHaveValue('typed-alias');
	await expect(stock).toHaveValue('77');
	await expect(maxQuantityPerOrder).toHaveValue('9');
	await expect(buttonText).toHaveValue('Typed button');
	await expect(hideFromSEO).not.toBeChecked();
});

test('a tag keeps what was typed and ticked when one of its options is ticked', async ({
	page
}) => {
	await page.goto(`/admin/tags/${TAG_ID}`, { waitUntil: 'networkidle' });
	await unfoldEverySection(page);
	const buttonText = page.locator('input[name="cta[0].label"]');
	const openNewTab = page.locator('input[name="cta[0].openNewTab"]');
	await expect(openNewTab).toBeChecked();

	await buttonText.fill('Typed button');
	await openNewTab.uncheck();
	await page.locator('input[name="widgetUseOnly"]').click();

	await expect(buttonText).toHaveValue('Typed button');
	await expect(openNewTab).not.toBeChecked();
});

test('the layout settings keep what was typed and ticked when a link line is removed', async ({
	page
}) => {
	await page.goto('/admin/layout', { waitUntil: 'networkidle' });
	const brandName = page.locator('input[name="brandName"]');
	const websiteTitle = page.locator('input[name="websiteTitle"]');
	const poweredBy = page.locator('input[name="displayPoweredBy"]');
	await expect(poweredBy).toBeChecked();
	const navbarLines = page.locator('input[name^="navbarLinks["][name$=".id"]');
	const linesAtFirst = await navbarLines.count();

	await brandName.fill('Typed brand');
	await websiteTitle.fill('Typed title');
	await poweredBy.uncheck();
	// The line added here is empty, so removing it takes no existing link away.
	await page.getByRole('button', { name: 'Add navbar link' }).click();
	await page.locator(`div:has(> input[name="navbarLinks[${linesAtFirst}].id"]) button`).click();
	await expect(navbarLines).toHaveCount(linesAtFirst);

	await expect(brandName).toHaveValue('Typed brand');
	await expect(websiteTitle).toHaveValue('Typed title');
	await expect(poweredBy).not.toBeChecked();
});

test('the roles and users keep what was typed when a box is ticked for a user', async ({
	page
}) => {
	await page.goto('/admin/arm', { waitUntil: 'networkidle' });
	const user = page.locator('form[action*="/arm/user/"]').first();
	const alias = user.locator('input[name="alias"]');
	const roleName = page
		.locator('form[action*="/arm/role/"] input[name="name"]:not([readonly])')
		.first();

	await alias.fill('Typed alias');
	await roleName.fill('Typed role');
	await user.locator('input[name="hasPosOptions"]').click();

	await expect(alias).toHaveValue('Typed alias');
	await expect(roleName).toHaveValue('Typed role');
});
