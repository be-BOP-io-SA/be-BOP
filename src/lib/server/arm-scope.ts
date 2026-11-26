import { error } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { isRoleWithin, type Role } from '$lib/types/Role';
import { SUPER_ADMIN_ROLE_ID, type User } from '$lib/types/User';

type Caller = App.Locals['user'];

// A scoped ARM manager must not reach beyond their own role by handing out, or taking over, a wider one.
export function canManageRole(caller: Caller, target: Role): boolean {
	if (caller?.roleId === SUPER_ADMIN_ROLE_ID) {
		return true;
	}

	return !!caller?.role && isRoleWithin(target, caller.role);
}

export async function requireCanManageUser(caller: Caller, user: Pick<User, 'roleId'>) {
	if (caller?.roleId === SUPER_ADMIN_ROLE_ID) {
		return;
	}

	const role = await collections.roles.findOne({ _id: user.roleId });

	if (!role || !canManageRole(caller, role)) {
		throw error(403, 'You cannot manage a user whose role is wider than your own');
	}
}
