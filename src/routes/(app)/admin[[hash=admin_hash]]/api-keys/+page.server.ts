import { listApiKeys, serializeApiKeyPublic } from '$lib/server/api/keys';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import { normalizeApiV1CorsOrigins } from '$lib/server/api/v1/cors';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

export async function load({ locals }) {
	if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
		throw error(403, 'Forbidden. Only Super Admin can access this page !');
	}

	const keys = await listApiKeys();
	return {
		keys: keys.map(serializeApiKeyPublic),
		corsOrigins: runtimeConfig.apiV1.corsOrigins.join('\n')
	};
}

export const actions = {
	updateCors: async function ({ request, locals }) {
		if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'Forbidden. Only Super Admin can access this page !');
		}

		const formData = await request.formData();
		const parsed = z
			.object({
				corsOrigins: z.string()
			})
			.parse({
				corsOrigins: formData.get('corsOrigins') ?? ''
			});

		// Accept newline- and/or comma-separated origins; never keep "*".
		const corsOrigins = normalizeApiV1CorsOrigins(
			parsed.corsOrigins
				.split(/[\n,]+/)
				.map((s) => s.trim())
				.filter(Boolean)
		);

		const apiV1 = { ...runtimeConfig.apiV1, corsOrigins };
		await persistConfigElement('apiV1', apiV1);
		runtimeConfig.apiV1 = apiV1;

		return { corsSuccess: true };
	}
};
