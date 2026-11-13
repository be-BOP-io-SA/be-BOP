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

	it('does not let a manager without point of sale grant it', async () => {
		const staffId = await seedStaff(false);
		expect(await update(managerRole, staffId, { hasPosOptions: 'on' })).toBe(false);
	});

	it('refuses a manager without point of sale the edit of a user who has it', async () => {
		const staffId = await seedStaff(true);
		await expect(
			update(managerRole, staffId, { recoveryEmail: 'manager@example.com' })
		).rejects.toMatchObject({ status: 403 });
		const staff = await collections.users.findOne({ _id: staffId });
		expect(staff?.recovery?.email).toBe('staff@example.com');
		expect(staff?.hasPosOptions).toBe(true);
	});

	it('refuses a manager without point of sale the password reset of a user who has it', async () => {
		const staffId = await seedStaff(true);
		await expect(
			actions.resetPassword({
				params: { id: staffId.toString() },
				locals: { user: callerOf(managerRole) }
			} as unknown as Parameters<(typeof actions)['resetPassword']>[0])
		).rejects.toMatchObject({ status: 403 });
		expect((await collections.users.findOne({ _id: staffId }))?.recovery?.email).toBe(
			'staff@example.com'
		);
	});

	it('lets a manager with point of sale edit a user who has it', async () => {
		const staffId = await seedStaff(true);
		expect(await update(posManagerRole, staffId, { hasPosOptions: 'on', alias: 'Desk' })).toBe(
			true
		);
		expect((await collections.users.findOne({ _id: staffId }))?.alias).toBe('Desk');
	});

	it('lets a manager with point of sale grant and remove it', async () => {
		const staffId = await seedStaff(false);
		expect(await update(posManagerRole, staffId, { hasPosOptions: 'on' })).toBe(true);
		expect(await update(posManagerRole, staffId, {})).toBe(false);
	});
});
