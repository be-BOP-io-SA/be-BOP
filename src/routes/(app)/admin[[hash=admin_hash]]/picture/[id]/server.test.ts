import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { adminPrefix } from '$lib/server/admin';
import { actions } from './+page.server';

async function insertPicture(owner: Record<string, unknown>) {
	await collections.pictures.insertOne({
		_id: 'picture-to-delete',
		name: 'Picture',
		storage: {
			original: { key: 'original.png', width: 800, height: 800, size: 1 },
			formats: [{ key: 'format.webp', width: 800, height: 800, size: 1 }]
		},
		createdAt: new Date(),
		updatedAt: new Date(),
		...owner
	});
}

async function deleteAndGetRedirect(): Promise<unknown> {
	try {
		await actions.delete({ params: { id: 'picture-to-delete' } } as Parameters<
			typeof actions.delete
		>[0]);
	} catch (thrown) {
		return thrown;
	}
	throw new Error('delete did not redirect');
}

describe('picture delete', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it("sends an event picture's admin back to the schedule it belongs to", async () => {
		await insertPicture({ schedule: { _id: 'my-schedule', eventSlug: 'my-event' } });

		expect(await deleteAndGetRedirect()).toMatchObject({
			status: 303,
			location: `${adminPrefix()}/schedule/my-schedule`
		});
		expect(await collections.pictures.countDocuments()).toBe(0);
	});

	it('still sends a picture without owner back to the picture list', async () => {
		await insertPicture({});

		expect(await deleteAndGetRedirect()).toMatchObject({
			status: 303,
			location: `${adminPrefix()}/picture`
		});
	});
});
