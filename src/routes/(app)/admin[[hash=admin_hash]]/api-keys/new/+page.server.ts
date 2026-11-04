import { createApiKey } from '$lib/server/api/keys';
import { parseExpiresAtFormValue } from '$lib/server/api/expires-at';
import { setApiKeyRevealCookie } from '$lib/server/api/reveal-flash';
import { adminPrefix } from '$lib/server/admin';
import { API_V1_SCOPES, type ApiV1Scope } from '$lib/types/ApiV1';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { z } from 'zod';

export function load({ locals }) {
	if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
		throw error(403, 'Forbidden. Only Super Admin can access this page !');
	}
	return { scopes: [...API_V1_SCOPES] };
}

export const actions: Actions = {
	createApiKey: async ({ request, locals, cookies }) => {
		if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'Forbidden. Only Super Admin can access this page !');
		}

		const formData = await request.formData();
		const scopesRaw = formData.getAll('scopes').map(String);
		const expiresParsed = parseExpiresAtFormValue(
			formData.get('expiresAt'),
			formData.get('expiresAtOffsetMinutes'),
			formData.get('expiresAtLocal')
		);
		if (!expiresParsed.ok) {
			return fail(400, { error: { formErrors: [expiresParsed.message], fieldErrors: {} } });
		}
		// A past date parses fine, then isApiKeyUsable rejects the key on first use: the admin walks
		// away from the reveal page holding a secret that never worked.
		if (expiresParsed.value && expiresParsed.value.getTime() <= Date.now()) {
			return fail(400, {
				error: { formErrors: ['Expiration date must be in the future'], fieldErrors: {} }
			});
		}

		const parsed = z
			.object({
				name: z.string().trim().min(1).max(200),
				scopes: z.array(z.enum(API_V1_SCOPES)).min(1)
			})
			.safeParse({
				name: formData.get('name'),
				scopes: scopesRaw
			});

		if (!parsed.success) {
			return fail(400, { error: parsed.error.flatten() });
		}

		const { apiKey, secret } = await createApiKey({
			name: parsed.data.name,
			scopes: parsed.data.scopes as ApiV1Scope[],
			expiresAt: expiresParsed.value,
			createdBy: locals.user?._id?.toString()
		});

		// PRG: stash secret in a short-lived signed httpOnly cookie, then redirect.
		// Refreshing the reveal page must not recreate a key.
		setApiKeyRevealCookie(cookies, {
			secret,
			prefix: apiKey.keyPrefix,
			id: apiKey._id.toString(),
			name: apiKey.name
		});

		throw redirect(303, `${adminPrefix()}/api-keys/new/reveal`);
	}
};
