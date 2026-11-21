import { beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { cleanDb } from './test-utils';
import { collections } from './database';
import {
	addPosBadge,
	openOperatorSession,
	operatorFromBadge,
	operatorFromPin,
	operatorOfSession,
	renewPosBadge,
	setPosBadgeSuspended,
	setPosPin
} from './arm-pos';

describe('arm-pos', () => {
	const userId = new ObjectId();

	beforeEach(async () => {
		await cleanDb();
		await collections.roles.insertOne({
			_id: 'cashier',
			name: 'Cashier',
			posActions: ['charge'],
			permissions: { read: [], write: [], forbidden: [] },
			createdAt: new Date(),
			updatedAt: new Date()
		});
		await collections.users.insertOne({
			_id: userId,
			login: 'alice',
			alias: 'Alice',
			roleId: 'cashier',
			createdAt: new Date(),
			updatedAt: new Date()
		});
	});

	it('signs an operator in with the right PIN only', async () => {
		await setPosPin(userId, '1234');

		expect((await operatorFromPin(userId, '1234'))?.actions).toEqual(['charge']);
		expect(await operatorFromPin(userId, '4321')).toBeNull();
	});

	it('stops a renewed or suspended badge from signing in', async () => {
		const first = await addPosBadge(userId);
		expect((await operatorFromBadge(first))?.alias).toBe('Alice');

		const badgeId = (await collections.users.findOne({ _id: userId }))?.posBadges?.[0]._id;
		if (!badgeId) {
			throw new Error('badge not stored');
		}
		const renewed = await renewPosBadge(userId, badgeId);
		expect(await operatorFromBadge(first)).toBeNull();
		expect(await operatorFromBadge(renewed)).not.toBeNull();

		await setPosBadgeSuspended(userId, badgeId, true);
		expect(await operatorFromBadge(renewed)).toBeNull();
	});

	it('keeps an operator session to the terminal it was opened on', async () => {
		const terminal = new ObjectId();
		const token = await openOperatorSession(terminal, userId);

		expect((await operatorOfSession(token, terminal))?.alias).toBe('Alice');
		expect(await operatorOfSession(token, new ObjectId())).toBeNull();
	});
});
