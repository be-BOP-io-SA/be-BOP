import { expect, test } from '@playwright/test';
import { MongoClient } from 'mongodb';

// Same database as the web server started by playwright.config.ts.
const E2E_DB = 'bebop-e2e';
const SCHEDULE_ID = 'e2e-schedule-picture-delete';
const PICTURE_ID = 'e2e-event-picture';

async function withDb<T>(run: (db: ReturnType<MongoClient['db']>) => Promise<T>): Promise<T> {
	const client = await MongoClient.connect(process.env.MONGODB_URL || 'mongodb://127.0.0.1:27017');
	try {
		return await run(client.db(E2E_DB));
	} finally {
		await client.close();
	}
}

test.beforeAll(async () => {
	// Seeded directly: adding a picture through the admin needs an S3 upload.
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
						title: 'E2E event',
						slug: 'e2e-event',
						beginsAt: new Date('2030-01-01T10:00:00Z'),
						endsAt: new Date('2030-01-01T12:00:00Z')
					}
				],
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ upsert: true }
		);
		await db.collection('pictures').replaceOne(
			{ _id: PICTURE_ID as never },
			{
				name: 'E2E event picture',
				schedule: { _id: SCHEDULE_ID, eventSlug: 'e2e-event' },
				storage: {
					original: { key: 'e2e.png', width: 800, height: 800, size: 1 },
					formats: [{ key: 'e2e-800.webp', width: 800, height: 800, size: 1 }]
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
		await db.collection('schedules').deleteOne({ _id: SCHEDULE_ID as never });
		await db.collection('pictures').deleteOne({ _id: PICTURE_ID as never });
	});
});

test('deleting an event picture returns to the schedule it belongs to', async ({ page }) => {
	await page.goto(`/admin/picture/${PICTURE_ID}`);
	await page.locator('input[type="submit"][value="Delete"]').click();

	await expect(page).toHaveURL(new RegExp(`/admin/schedule/${SCHEDULE_ID}$`));
	await expect(page.getByText('E2E event picture')).toHaveCount(0);
});
