import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { CUSTOMER_ROLE_ID, POS_ROLE_ID } from '$lib/types/User';
import { fetchOrderForUser } from './fetchOrderForUser';
import { API_NOTE_ROLE, apiNoteAlias } from '$lib/server/api/v1/orders/seller';

function note(role: string | null, userAlias?: string) {
	return { role, userAlias, content: `by ${role}`, createdAt: new Date() };
}

describe('fetchOrderForUser notes', () => {
	beforeEach(async () => {
		await cleanDb();
		// Built-in roles are reseeded in the background after cleanDb, so the role may not exist yet.
		await collections.roles.updateOne(
			{ _id: POS_ROLE_ID },
			{ $set: { name: 'Point of sale' } },
			{ upsert: true }
		);
	});

	it('names an employee by alias, else by role name, else by role id', async () => {
		const order = await insertTestOrder({
			notes: [
				note(POS_ROLE_ID, 'Alice'),
				note(POS_ROLE_ID),
				note('removed-role'),
				note(CUSTOMER_ROLE_ID),
				note(null)
			]
		});

		const { notes } = await fetchOrderForUser(order._id);

		expect(
			notes.map(({ alias, isEmployee, isSystem }) => ({ alias, isEmployee, isSystem }))
		).toEqual([
			{ alias: 'Alice', isEmployee: true, isSystem: false },
			{ alias: 'Point of sale', isEmployee: true, isSystem: false },
			{ alias: 'removed-role', isEmployee: true, isSystem: false },
			{ alias: undefined, isEmployee: false, isSystem: false },
			{ alias: undefined, isEmployee: true, isSystem: true }
		]);
	});

	it('lists a note written through the API with the staff notes, under the key name', async () => {
		const order = await insertTestOrder({
			notes: [note(API_NOTE_ROLE, apiNoteAlias('Testropic'))]
		});

		const { notes } = await fetchOrderForUser(order._id);

		expect(notes[0]).toMatchObject({
			alias: 'API - Testropic',
			isEmployee: true,
			isSystem: false
		});
	});
});
