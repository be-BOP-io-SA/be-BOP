import { canManageRole } from '$lib/server/arm-scope';
import { collections } from '$lib/server/database';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const roles = await collections.roles.find().sort({ createdAt: 1 }).toArray();

	return {
		roles,
		manageableRoleIds: roles
			.filter((role) => canManageRole(locals.user, role))
			.map((role) => role._id)
	};
};
