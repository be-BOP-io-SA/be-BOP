import { expect, test, type Page } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const SCHEDULE_ID = 'e2e-schedule-event-delete';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

function event(title: string, slug: string, day: number) {
	return {
		title,
		slug,
		beginsAt: new Date(`2030-01-0${day}T10:00:00Z`),
		endsAt: new Date(`2030-01-0${day}T12:00:00Z`)
	};
}

async function savedSlugs(): Promise<string[]> {
	const schedule = await withDb((db) =>
		db.collection('schedules').findOne({ _id: SCHEDULE_ID as never })
	);
	return schedule?.events.map((e: { slug: string }) => e.slug);
}

// A native alert blocks the click that opened it until it is closed.
function recordDialogs(page: Page): string[] {
	const messages: string[] = [];
	page.on('dialog', async (dialog) => {
		messages.push(dialog.message());
		await dialog.accept();
	});
	return messages;
}

async function openSchedule(page: Page) {
	await page.goto(`/admin/schedule/${SCHEDULE_ID}`, { waitUntil: 'networkidle' });
}

const trashButtons = (page: Page) => page.getByRole('button', { name: '🗑️' });

test.beforeEach(async () => {
	await withDb((db) =>
		db.collection('schedules').replaceOne(
			{ _id: SCHEDULE_ID as never },
			{
				name: 'E2E schedule',
				pastEventDelay: 60,
				displayPastEvents: false,
				displayPastEventsAfterFuture: false,
				sortByEventDateDesc: false,
				// Two events share a title, as a repeated session would.
				events: [
					event('Workshop', 'workshop-monday', 1),
					event('Workshop', 'workshop-tuesday', 2),
					event('Concert', 'concert', 3)
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

test('deleting an event reminds to click Update, and Update saves only that event', async ({
	page
}) => {
	const dialogs = recordDialogs(page);
	await openSchedule(page);

	await trashButtons(page).first().click();

	expect(dialogs).toEqual([
		'The event is removed from this page only. Click "Update" to save the deletion.'
	]);
	await expect(trashButtons(page)).toHaveCount(2);

	await page.locator('input[type="submit"][value="Update"]').last().click();
	await expect.poll(savedSlugs).toEqual(['workshop-tuesday', 'concert']);
});

test('removing a line not saved yet works and needs no reminder', async ({ page }) => {
	const dialogs = recordDialogs(page);
	await openSchedule(page);

	await page.getByRole('button', { name: 'Add another event' }).click();
	await expect(trashButtons(page)).toHaveCount(4);
	await trashButtons(page).last().click();

	await expect(trashButtons(page)).toHaveCount(3);
	expect(dialogs).toEqual([]);
	expect(await savedSlugs()).toEqual(['workshop-monday', 'workshop-tuesday', 'concert']);
});

test.describe('in French', () => {
	test.use({ locale: 'fr-FR' });

	test('the reminder is translated', async ({ page }) => {
		const dialogs = recordDialogs(page);
		await openSchedule(page);

		await trashButtons(page).first().click();

		expect(dialogs).toEqual([
			"L'événement est retiré de cette page seulement. Cliquez sur « Update » pour enregistrer la suppression."
		]);
	});
});
