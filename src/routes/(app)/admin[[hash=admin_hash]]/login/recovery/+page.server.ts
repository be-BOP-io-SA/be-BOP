import { collections } from '$lib/server/database';
import { z } from 'zod';
import { sendResetPasswordNotification } from '$lib/server/sendNotification';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { SMTP_USER } from '$lib/server/env-config';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { rateLimit } from '$lib/server/rateLimit.js';

export const load = async () => {};

export const actions = {
	default: async function ({ request, locals }) {
		const data = await request.formData();

		const { login } = z
			.object({
				login: z.string()
			})
			.parse(Object.fromEntries(data));

		rateLimit(locals.clientIp, 'email', 5, { minutes: 5 });

		const user = await collections.users.findOne({ login, roleId: { $ne: CUSTOMER_ROLE_ID } });
		if (user) {
			const ret = await sendResetPasswordNotification(user, {
				alternateEmail: runtimeConfig.sellerIdentity?.contact.email || SMTP_USER
			});
			return {
				success: true,
				npub: !!ret.npub,
				email: !!ret.email,
				isBackupEmail: ret.email === (runtimeConfig.sellerIdentity?.contact.email || SMTP_USER)
			};
		} else {
			return { failedFindUser: true, login };
		}
	}
};
