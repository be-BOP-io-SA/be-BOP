import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const BOOKING_ID = 'e2e-booking-room';
const PLAIN_ID = 'e2e-plain-mug';
const NULL_SPEC_ID = 'e2e-null-spec-lamp';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

function product(_id: string, name: string, extra: Record<string, unknown> = {}) {
	return {
		name,
		alias: [_id],
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

test.beforeAll(async () => {
	await withDb(async (db) => {
		await db.collection('products').replaceOne(
			{ _id: BOOKING_ID as never },
			product(BOOKING_ID, 'E2E meeting room', {
				bookingSpec: {
					slotMinutes: 60,
					schedule: {
						timezone: 'Europe/Paris',
						monday: { start: '09:00', end: '17:00' },
						tuesday: null,
						wednesday: null,
						thursday: null,
						friday: null,
						saturday: null,
						sunday: null
					}
				}
			}),
			{ upsert: true }
		);
		await db
			.collection('products')
			.replaceOne({ _id: PLAIN_ID as never }, product(PLAIN_ID, 'E2E plain mug'), {
				upsert: true
			});
		// A null spec is outside the Product type but can sit in a shop's database.
		await db
			.collection('products')
			.replaceOne(
				{ _id: NULL_SPEC_ID as never },
				product(NULL_SPEC_ID, 'E2E null spec lamp', { bookingSpec: null }),
				{ upsert: true }
			);
	});
});

test.afterAll(async () => {
	await withDb((db) =>
		db
			.collection('products')
			.deleteMany({ _id: { $in: [BOOKING_ID, PLAIN_ID, NULL_SPEC_ID] as never[] } })
	);
});

test('the booking slot attribute lists only bookable products', async ({ page }) => {
	await page.goto('/admin/product');
	const attribute = page.locator('select[name="productAttribute"]');
	// Hydration can reset a choice made too early, and the form then posts an empty attribute.
	await expect(async () => {
		await attribute.selectOption({ label: 'Booking slot' });
		await attribute.evaluate((select) => (select as HTMLSelectElement).form?.requestSubmit());
		await page.waitForURL(/productAttribute=isBookingSlot/, { timeout: 5_000 });
	}).toPass();

	await expect(page.getByText('E2E meeting room')).toBeVisible();
	await expect(page.getByText('E2E plain mug')).toHaveCount(0);
	await expect(page.getByText('E2E null spec lamp')).toHaveCount(0);
});

test.describe('in English', () => {
	test.use({ locale: 'en-US' });

	test('the attribute menu reads as words, not field names', async ({ page }) => {
		await page.goto('/admin/product');

		await expect(page.locator('select[name="productAttribute"] option')).toHaveText([
			'',
			'Shipping',
			'Standalone',
			'Pay what you want',
			'Free',
			'Ticket',
			'Preorder',
			'Booking slot'
		]);
	});
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the attribute menu is translated', async ({ page }) => {
		await page.goto('/admin/product');

		const options = page.locator('select[name="productAttribute"] option');
		await expect(options).toContainText([
			'Livraison',
			'Autonome',
			'Prix libre',
			'Gratuit',
			'Billet',
			'Précommande',
			'Créneau de réservation'
		]);
	});
});
