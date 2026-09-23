import { adminPrefix } from '$lib/server/admin';
import { collections } from '$lib/server/database.js';
import { POS_ROLE_ID, SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';

export const actions = {
	update: async function ({ params, request, locals }) {
		const roleId = params.id;

		const role = await collections.roles.findOne({
			_id: roleId
		});

		if (!role) {
			throw error(404, 'Role not found');
		}

		// Rewriting a permission set is a super-admin act, as creating one is: a scoped ARM
		// manager who can widen any role can always reach the whole back office through it.
		if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'Only the super admin can change a role’s permissions');
		}

		const data = await request.formData();

		const parsed = z
			.object({
				name: z.string().trim(),
				hasPosOptions: z.boolean({ coerce: true }),
				read: z.array(z.string()).default([]),
				write: z.array(z.string()).default([]),
				forbidden: z.array(z.string()).default([])
			})
			.parse({
				name: data.get('name'),
				hasPosOptions: data.get('hasPosOptions'),
				read: JSON.parse(data.get('read')?.toString() ?? '[]'),
				write: JSON.parse(data.get('write')?.toString() ?? '[]'),
				forbidden: JSON.parse(data.get('forbidden')?.toString() ?? '[]')
			});

		await collections.roles.updateOne(
			{
				_id: roleId
			},
			{
				$set: {
					name: parsed.name,
					hasPosOptions: roleId === POS_ROLE_ID || parsed.hasPosOptions,
					permissions: {
						read: parsed.read,
						write: parsed.write,
						forbidden: parsed.forbidden
					},
					updatedAt: new Date()
				}
			}
		);
		await collections.users.updateMany(
			{ roleId: roleId },
			{ $set: { hasPosOptions: roleId === POS_ROLE_ID || parsed.hasPosOptions } }
		);

		throw redirect(303, `${adminPrefix()}/arm`);
	},
	delete: async function ({ params, locals }) {
		const roleId = params.id;

		// Destroying a permission set is a super-admin act, as authoring one is: only the super
		// admin can recreate it afterwards.
		if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'Only the super admin can delete a role');
		}

		if (roleId === SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'You cannot delete this role');
		}

		if (await collections.users.countDocuments({ roleId }, { limit: 1 })) {
			throw error(403, 'This role is used by at least one user');
		}

		await collections.roles.deleteOne({
			_id: roleId
		});

		throw redirect(303, `${adminPrefix()}/arm`);
	}
};
