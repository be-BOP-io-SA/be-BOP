import { listApiKeys, serializeApiKeyPublic } from '$lib/server/api/keys';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import { normalizeApiV1CorsOrigins } from '$lib/server/api/v1/cors';
import { isApiV1Enabled } from '$lib/server/api/v1/enabled';
import { closeAllStreams } from '$lib/server/api/v1/orders/paidStreamConnection';
import { API_LOG_MIN_SIZE_MB } from '$lib/types/ApiKey';
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
		apiEnabled: isApiV1Enabled(),
		logSettings: runtimeConfig.apiV1Log
	};
}

export const actions = {
	/** Its own form: a box left out of the CORS form would read as "off" and cut the API. */
	updateEnabled: async function ({ request, locals }) {
		if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'Forbidden. Only Super Admin can access this page !');
		}

		const enabled = !!(await request.formData()).get('enabled');
		const wasEnabled = isApiV1Enabled();
		const apiV1 = { ...runtimeConfig.apiV1, enabled };
		await persistConfigElement('apiV1', apiV1);
		runtimeConfig.apiV1 = apiV1;

		// What is open was let in before: cut it off now rather than at its next heartbeat. The
		// other servers of the shop find out at theirs.
		if (wasEnabled && !enabled) {
			closeAllStreams();
		}

		return { enabledSuccess: true };
	},

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
				maxSizeMb: z.union([z.literal(''), z.number({ coerce: true }).min(API_LOG_MIN_SIZE_MB)]),
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
