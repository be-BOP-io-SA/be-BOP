import { beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/database';
import { cleanDb } from '$lib/server/test-utils';
import type { Role } from '$lib/types/Role';
import { actions } from './+page.server';

type UpdateEvent = Parameters<(typeof actions)['update']>[0];

function role(_id: string, write: string[], hasPosOptions = false): Role {
	return {
		_id,
		name: _id,
		hasPosOptions,
		permissions: { read: [], write, forbidden: [] },
		createdAt: new Date(),
		updatedAt: new Date()
	};
}

const managerRole = role('manager', ['/admin/*']);
const posManagerRole = role('pos-manager', ['/admin/*'], true);
const staffRole = role('staff', []);

async function seedStaff(hasPosOptions: boolean) {
	const _id = new ObjectId();
	await collections.users.insertOne({
		_id,
		login: 'staff',
		roleId: staffRole._id,
		hasPosOptions,
		recovery: { email: 'staff@example.com' },
		createdAt: new Date(),
		updatedAt: new Date()
	});
	return _id;
}

function callerOf(callerRole: Role) {
	return {
		_id: new ObjectId(),
		login: callerRole._id,
		roleId: callerRole._id,
		role: callerRole,
		hasPosOptions: callerRole.hasPosOptions
	};
}

async function update(callerRole: Role, staffId: ObjectId, form: Record<string, string>) {
	const body = new FormData();
	for (const [key, value] of Object.entries({
		login: 'staff',
		recoveryEmail: 'staff@example.com',
		roleId: staffRole._id,
		status: 'enabled',
		...form
	})) {
		body.set(key, value);
	}
	try {
		await actions.update({
			params: { id: staffId.toString() },
			request: new Request('http://x/admin/arm/user', { method: 'POST', body }),
			locals: { user: callerOf(callerRole) }
		} as unknown as UpdateEvent);
	} catch (thrown) {
		if ((thrown as { status?: number }).status !== 303) {
			throw thrown;
		}
	}
	return (await collections.users.findOne({ _id: staffId }))?.hasPosOptions;
}

describe('arm user update, point-of-sale access', () => {
	beforeEach(async () => {
		await cleanDb();
		await collections.roles.insertMany([managerRole, posManagerRole, staffRole]);
	});

	it.each([managerRole, posManagerRole])(
		'lets $_id grant and remove it, and edit a user who has it',
		async (manager) => {
			const staffId = await seedStaff(false);
			expect(await update(manager, staffId, { hasPosOptions: 'on', alias: 'Desk' })).toBe(true);
			expect((await collections.users.findOne({ _id: staffId }))?.alias).toBe('Desk');
			expect(await update(manager, staffId, {})).toBe(false);
		}
	);
});
