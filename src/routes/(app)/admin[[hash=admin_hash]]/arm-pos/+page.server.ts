import { error, fail } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { collections } from '$lib/server/database';
import {
	addPosBadge,
	isValidPin,
	removePosBadge,
	renewPosBadge,
	setPosBadgeSuspended,
	setPosPin
} from '$lib/server/arm-pos';
import { POS_ACTIONS, type PosAction } from '$lib/types/PosAction';
import { CUSTOMER_ROLE_ID, SUPER_ADMIN_ROLE_ID } from '$lib/types/User';

/** arm-pos: the terminal rights of each role, and how each operator signs in on a terminal. */
export async function load() {
	const [roles, users] = await Promise.all([
		collections.roles.find({ _id: { $nin: [CUSTOMER_ROLE_ID, SUPER_ADMIN_ROLE_ID] } }).toArray(),
		collections.users
			.find({ roleId: { $ne: CUSTOMER_ROLE_ID } })
			.sort({ login: 1 })
			.toArray()
	]);

	return {
		actions: [...POS_ACTIONS],
		roles: roles.map((role) => ({
			_id: role._id,
			name: role.name,
			posActions: role.posActions ?? []
		})),
		users: users.map((user) => ({
			_id: user._id.toHexString(),
			name: user.alias || user.login,
			roleId: user.roleId,
			disabled: !!user.disabled,
			hasPin: !!user.posPin,
			badges: (user.posBadges ?? []).map((badge) => ({
				_id: badge._id.toHexString(),
				prefix: badge.prefix,
				createdAt: badge.createdAt,
				suspended: !!badge.suspendedAt
			}))
		}))
	};
}

const objectId = (value: FormDataEntryValue | null) => {
	const id = String(value ?? '');
	if (!ObjectId.isValid(id)) {
		throw error(400, 'Invalid id');
	}
	return new ObjectId(id);
};

export const actions = {
	async roleActions({ request }) {
		const data = await request.formData();
		const roleId = String(data.get('roleId') ?? '');
		if (!roleId || roleId === CUSTOMER_ROLE_ID || roleId === SUPER_ADMIN_ROLE_ID) {
			throw error(400, 'Invalid role');
		}
		const posActions = data
			.getAll('posActions')
			.map(String)
			.filter((action): action is PosAction => (POS_ACTIONS as readonly string[]).includes(action));
		await collections.roles.updateOne(
			{ _id: roleId },
			{ $set: { posActions, updatedAt: new Date() } }
		);
	},

	async pin({ request }) {
		const data = await request.formData();
		const userId = objectId(data.get('userId'));
		const parsed = z.string().safeParse(data.get('pin'));
		if (!parsed.success || !isValidPin(parsed.data)) {
			return fail(400, { error: 'pin' as const, userId: userId.toHexString() });
		}
		await setPosPin(userId, parsed.data);
	},

	async clearPin({ request }) {
		await setPosPin(objectId((await request.formData()).get('userId')), null);
	},

	async addBadge({ request }) {
		const userId = objectId((await request.formData()).get('userId'));
		return { badgeIdentifier: await addPosBadge(userId), userId: userId.toHexString() };
	},

	async renewBadge({ request }) {
		const data = await request.formData();
		const userId = objectId(data.get('userId'));
		const identifier = await renewPosBadge(userId, objectId(data.get('badgeId')));
		return { badgeIdentifier: identifier, userId: userId.toHexString() };
	},

	async suspendBadge({ request }) {
		const data = await request.formData();
		await setPosBadgeSuspended(
			objectId(data.get('userId')),
			objectId(data.get('badgeId')),
			data.get('suspended') === 'true'
		);
	},

	async removeBadge({ request }) {
		const data = await request.formData();
		await removePosBadge(objectId(data.get('userId')), objectId(data.get('badgeId')));
	}
};
