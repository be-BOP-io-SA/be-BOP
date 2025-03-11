import { z } from 'zod';
import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { ObjectId } from 'mongodb';
import { zodNpub } from '$lib/server/nostr.js';
import { sendResetPasswordNotification } from '$lib/server/sendNotification.js';
import { adminPrefix } from '$lib/server/admin.js';
import { isUniqueConstraintError } from '$lib/server/utils/isUniqueConstraintError';

export const actions = {
	default: async function ({ request }) {
		const data = await request.formData();
		const allowedRoles = (await collections.roles.find().toArray()).filter(
			(role) => role._id !== SUPER_ADMIN_ROLE_ID
		);

		const { login, alias, email, npub, roleId } = z
			.object({
				login: z.string(),
				alias: z.string().optional(),
				email: z.string().email().optional(),
				npub: zodNpub().optional(),
				roleId: z.enum([allowedRoles[0]._id, ...allowedRoles.map((role) => role._id)])
			})
			.parse({
				...Object.fromEntries(data),
				email: data.get('email')?.toString() || undefined,
				npub: data.get('npub')?.toString() || undefined
			});

		if (!email && !npub) {
			throw error(400, 'You must provide a recovery email or npub');
		}

		const user = {
			_id: new ObjectId(),
			login,
			...(alias && { alias }),
			recovery: {
				...(email && { email }),
				...(npub && { npub })
			},
			createdAt: new Date(),
			updatedAt: new Date(),
			roleId
		};
		try {
			await collections.users.insertOne(user);

			await sendResetPasswordNotification(user);

			throw redirect(303, `${adminPrefix()}/arm`);
		} catch (err) {
			if (isUniqueConstraintError(err)) {
				throw error(409, 'A user with the same email or npub already exists');
			}
			throw err;
		}
	}
};
