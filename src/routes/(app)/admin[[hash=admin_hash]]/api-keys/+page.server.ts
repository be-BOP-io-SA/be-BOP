import { listApiKeys, serializeApiKeyPublic } from '$lib/server/api/keys';
import { listApiV1Logs } from '$lib/server/api/v1/log';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { persistConfigElement } from '$lib/server/utils/persistConfig';
import { normalizeApiV1CorsOrigins } from '$lib/server/api/v1/cors';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

/** Entries per page in the call journal. */
const LOG_PAGE_SIZE = 25;

export async function load({ locals, url }) {
	if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
		throw error(403, 'Forbidden. Only Super Admin can access this page !');
	}

	const logKeyId = url.searchParams.get('logKey') ?? '';
	const logOutcome = url.searchParams.get('logOutcome') === 'errors' ? 'errors' : 'all';
	const logPage = Math.max(Number(url.searchParams.get('logPage') ?? '1') || 1, 1);

	const [keys, logs] = await Promise.all([
		listApiKeys(),
		listApiV1Logs({
			...(logKeyId && { apiKeyId: logKeyId }),
			outcome: logOutcome,
			skip: (logPage - 1) * LOG_PAGE_SIZE,
			limit: LOG_PAGE_SIZE
		})
	]);

	return {
		keys: keys.map(serializeApiKeyPublic),
		corsOrigins: runtimeConfig.apiV1.corsOrigins.join('\n'),
		trustExternalPricing: runtimeConfig.apiV1.trustExternalPricing,
		logs: {
			entries: logs.entries.map((entry) => ({
				id: entry._id.toString(),
				createdAt: entry.createdAt.toISOString(),
				keyName: entry.keyName ?? null,
				keyPrefix: entry.keyPrefix ?? null,
				method: entry.method,
				path: entry.path,
				query: entry.query ?? null,
				status: entry.status,
				durationMs: entry.durationMs,
				errorCode: entry.errorCode ?? null,
				clientIp: entry.clientIp ?? null,
				requestBody: entry.requestBody ?? null,
				responseBody: entry.responseBody ?? null,
				truncated: !!entry.truncated,
				stream: !!entry.stream
			})),
			total: logs.total,
			page: logPage,
			pageSize: LOG_PAGE_SIZE,
			keyId: logKeyId,
			outcome: logOutcome
		}
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
	}
};
