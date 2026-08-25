import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import { CUSTOMER_ROLE_ID, MIN_PASSWORD_LENGTH, type User } from '$lib/types/User';
import type { SetRequired } from 'type-fest';
import { BCRYPT_SALT_ROUNDS } from '$lib/server/user.js';
import { adminPrefix } from '$lib/server/admin.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const user = await collections.users.findOne<SetRequired<User, 'passwordReset'>>({
		'passwordReset.token': params.token,
		roleId: { $ne: CUSTOMER_ROLE_ID }
	});

	if (!user) {
		throw error(404, 'Password reset token not found');
	}

	if (user.passwordReset?.expiresAt < new Date()) {
		throw error(400, 'Password reset token has expired');
	}
	return { user: { _id: user._id.toString(), login: user.login } };
};

export const actions: Actions = {
	default: async function ({ request, params }) {
		const user = await collections.users.findOne<SetRequired<User, 'passwordReset'>>({
			'passwordReset.token': params.token,
			roleId: { $ne: CUSTOMER_ROLE_ID }
		});

		if (!user) {
			throw error(404, 'Password reset token not found');
		}

		if (user.passwordReset?.expiresAt < new Date()) {
			throw error(400, 'Password reset token has expired');
		}

		const data = await request.formData();
		const { password } = z
			.object({
				password: z.string().min(MIN_PASSWORD_LENGTH)
			})
			.parse({
				password: data.get('password')
			});

		const passwordBcrypt = await bcryptjs.hash(password, BCRYPT_SALT_ROUNDS);
		await collections.users.updateOne(
			{
				_id: user._id
			},
			{ $set: { password: passwordBcrypt }, $unset: { passwordReset: '' } }
		);
		throw redirect(303, `${adminPrefix()}/login`);
	}
};
