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
		corsOrigins: runtimeConfig.apiV1.corsOrigins.join('\n'),
		trustExternalPricing: runtimeConfig.apiV1.trustExternalPricing,
		logSettings: runtimeConfig.apiV1Log
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
				corsOrigins: z.string(),
				trustExternalPricing: z.boolean({ coerce: true })
			})
			.parse({
				corsOrigins: formData.get('corsOrigins') ?? '',
				trustExternalPricing: !!formData.get('trustExternalPricing')
			});

		// Accept newline- and/or comma-separated origins. A lone "*" opens every origin.
		const corsOrigins = normalizeApiV1CorsOrigins(
			parsed.corsOrigins
				.split(/[\n,]+/)
				.map((s) => s.trim())
				.filter(Boolean)
		);

		const apiV1 = {
			...runtimeConfig.apiV1,
			corsOrigins,
			trustExternalPricing: parsed.trustExternalPricing
		};
		await persistConfigElement('apiV1', apiV1);
		runtimeConfig.apiV1 = apiV1;

		return { corsSuccess: true };
	},

	updateLogSettings: async function ({ request, locals }) {
		if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'Forbidden. Only Super Admin can access this page !');
		}

		const formData = await request.formData();
		const parsed = z
			.object({
				// Empty means no limit.
				maxSizeMb: z.union([z.literal(''), z.number({ coerce: true }).positive()]),
				logSuccesses: z.boolean({ coerce: true }),
				logErrors: z.boolean({ coerce: true }),
				logUnauthenticated: z.boolean({ coerce: true })
			})
			.parse({
				maxSizeMb: String(formData.get('logMaxSizeMb') ?? '').trim(),
				logSuccesses: !!formData.get('logSuccesses'),
				logErrors: !!formData.get('logErrors'),
				logUnauthenticated: !!formData.get('logUnauthenticated')
			});

		const apiV1Log = {
			...runtimeConfig.apiV1Log,
			maxSizeMb: parsed.maxSizeMb === '' ? null : parsed.maxSizeMb,
			logSuccesses: parsed.logSuccesses,
			logErrors: parsed.logErrors,
			logUnauthenticated: parsed.logUnauthenticated
		};
		await persistConfigElement('apiV1Log', apiV1Log);
		runtimeConfig.apiV1Log = apiV1Log;

		return { logSettingsSuccess: true };
	}
};
