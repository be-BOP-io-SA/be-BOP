import { expect, test } from './client-ip.js';
import { withDb } from './pending-order.js';

/**
 * Most admin forms mix two kinds of fields: some store what is entered in the page's data
 * at once, the others only read their starting value from it. Filling one of the first kind
 * must leave alone what was just entered in the second kind, on a page loaded from the server.
 */

const SCHEDULE_ID = 'e2e-form-keeps-typed';

test.beforeAll(async () => {
	await withDb((db) =>
		db.collection('schedules').replaceOne(
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
		)
	);
});

test.afterAll(async () => {
	await withDb((db) => db.collection('schedules').deleteOne({ _id: SCHEDULE_ID as never }));
});

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
	// Nothing is saved: the test leaves the page without submitting the form.
});

test('an agenda keeps what was typed when one of its options is ticked', async ({ page }) => {
	await page.goto(`/admin/schedule/${SCHEDULE_ID}`, { waitUntil: 'networkidle' });
	// The fields of an event are folded away until the event is opened.
	await page.evaluate(() =>
		document.querySelectorAll('details').forEach((details) => (details.open = true))
	);
	const title = page.locator('input[name="events[0].title"]');
	const pastEventDelay = page.locator('input[name="pastEventDelay"]');

	await title.fill('Typed title');
	await pastEventDelay.fill('123');
	await page.locator('input[name="sortByEventDateDesc"]').click();

	await expect(title).toHaveValue('Typed title');
	await expect(pastEventDelay).toHaveValue('123');
});
