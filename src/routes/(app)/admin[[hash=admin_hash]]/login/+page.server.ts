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

/** A bcrypt hash of no one's password, compared against when the login is unknown. */
const TIMING_EQUALISER_HASH = '$2a$10$qz09XxQBnuGawp7M3s5dm.vJzU2D1V1lfPuw6BMUPinnI81gGKOQ2';

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
		// Spraying from many addresses still converges on one account.
		rateLimit(`account:${login.toLowerCase()}`, 'login', 30, { minutes: 15 });

		// HP-2026-08-13 (review #2715) : login stays fail-open — `null`
		// (HIBP API unreachable) does not block the connection, only an
		// actually pwned password (count > 0) is rejected.
		// Checked before the lookup so the answer is the same whether the login exists or not.
		const pwnedTimes = await checkPasswordPwnedTimes(password);
		if (pwnedTimes) {
			throw error(400, 'Password has been pwned');
		}

		let user = await collections.users.findOne({ login: login, roleId: { $ne: CUSTOMER_ROLE_ID } });

		if (!user && !runtimeConfig.isAdminCreated) {
			await createSuperAdminUserInDb(login, password);

			user = await collections.users.findOne({ login: login });
		}

		// Unknown login, wrong password: same answer, same bcrypt cost, so neither lists accounts.
		const passwordMatches = await bcryptjs.compare(
			password,
			user?.password ?? TIMING_EQUALISER_HASH
		);
		if (!user || !user.password || !passwordMatches) {
			return fail(400, { login, incorrect: 'credentials' });
		}

		if (user.disabled) {
			return fail(400, {
				login,
				disabledUser:
					'There was an error with this account, please contact your be-BOP administrator to check your account status'
			});
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
