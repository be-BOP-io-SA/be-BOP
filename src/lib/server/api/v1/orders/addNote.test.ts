import { beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import { addOrderNote } from './addNote';

describe('addOrderNote', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('signs the note with the key name, never with an admin role', async () => {
		const order = await insertTestOrder();

		const result = await addOrderNote({
			orderId: order._id,
			content: 'Bracelet 42 handed over',
			keyName: 'Front desk'
		});

		expect(result).toMatchObject({
			ok: true,
			notes: [{ content: 'Bracelet 42 handed over', author: 'employee', alias: 'API - Front desk' }]
		});
		const stored = await collections.orders.findOne({ _id: order._id });
		expect(stored?.notes?.[0].role).not.toBe(SUPER_ADMIN_ROLE_ID);
		expect(stored?.notes?.[0].userAlias).toBe('API - Front desk');
	});

	it('leaves an order written by another key alone when restricted to its own', async () => {
		const order = await insertTestOrder({ externalSourceApiKeyId: new ObjectId() });

		const result = await addOrderNote({
			orderId: order._id,
			content: 'not mine',
			keyName: 'Front desk',
			ownedBy: new ObjectId()
		});

		expect(result).toEqual({ ok: false, reason: 'ORDER_NOT_FOUND' });
		const stored = await collections.orders.findOne({ _id: order._id });
		expect(stored?.notes ?? []).toHaveLength(0);
	});

	it('annotates an order the restricted key wrote itself', async () => {
		const keyId = new ObjectId();
		const order = await insertTestOrder({ externalSourceApiKeyId: keyId });

		const result = await addOrderNote({
			orderId: order._id,
			content: 'mine',
			keyName: 'Front desk',
			ownedBy: keyId
		});

		expect(result.ok).toBe(true);
	});
});
