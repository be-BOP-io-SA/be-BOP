import { collections } from '$lib/server/database';
import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import bcryptjs from 'bcryptjs';
import { addSeconds, addYears } from 'date-fns';
import { runtimeConfig } from '$lib/server/runtime-config';
import { createSuperAdminUserInDb, renewSessionId } from '$lib/server/user.js';
import {
	CUSTOMER_ROLE_ID,
	MIN_PASSWORD_LENGTH,
	POS_ROLE_ID,
	checkPasswordPwnedTimes
} from '$lib/types/User.js';
import { adminPrefix } from '$lib/server/admin.js';
import { rateLimit } from '$lib/server/rateLimit.js';

export const load = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, locals.user.roleId === POS_ROLE_ID ? '/pos' : `/admin`);
	}

	return {
		isAdminCreated: runtimeConfig.isAdminCreated
	};
};

export const actions = {
	default: async function ({ locals, request, cookies }) {
		rateLimit(locals.clientIp, 'login', 10, { minutes: 5 });

		const data = await request.formData();

		const { login, password, remember, memorize } = z
			.object({
				login: z.string(),
				password: z.string().min(MIN_PASSWORD_LENGTH),
				remember: z.boolean({ coerce: true }).default(false),
				memorize: z.number({ coerce: true }).int()
			})
			.parse({
				login: data.get('login'),
				password: data.get('password'),
				remember: data.get('remember'),
				memorize: data.get('memorize')
			});
		let user = await collections.users.findOne({ login: login, roleId: { $ne: CUSTOMER_ROLE_ID } });

		if (!user && !runtimeConfig.isAdminCreated) {
			await createSuperAdminUserInDb(login, password);

			user = await collections.users.findOne({ login: login });
		}

		if (!user) {
			return fail(400, { login, incorrect: 'login' });
		}

		if (await checkPasswordPwnedTimes(password)) {
			throw error(400, 'Password has been pwned');
		}

		if (user.disabled) {
			return fail(400, {
				login,
				disabledUser:
					'There was an error with this account, please contact your be-BOP administrator to check your account status'
			});
		}

		if (!user.password || !(await bcryptjs.compare(password, user.password))) {
			return fail(400, { login, incorrect: 'password' });
		}

		await collections.users.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
		await collections.sessions.updateOne(
			{
				sessionId: locals.sessionId
			},
			{
				$set: {
					userId: user._id,
					expiresAt: addYears(new Date(), 1),
					expireUserAt: addSeconds(new Date(), remember ? memorize : 3600)
				},
				$setOnInsert: {
					createdAt: new Date(),
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		await renewSessionId(locals, cookies);

		if (user.roleId === POS_ROLE_ID) {
			throw redirect(303, `/pos`);
		}

		throw redirect(303, adminPrefix());
	}
};
