import { listApiKeys } from '$lib/server/api/keys';
import { listApiV1Logs } from '$lib/server/api/v1/log';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { error } from '@sveltejs/kit';

/** Entries per page in the call journal. */
const LOG_PAGE_SIZE = 25;

export async function load({ locals, url }) {
	if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
		throw error(403, 'Forbidden. Only Super Admin can access this page !');
	}

	const keyId = url.searchParams.get('key') ?? '';
	const outcome = url.searchParams.get('outcome') === 'errors' ? 'errors' : 'all';
	const page = Math.max(Number(url.searchParams.get('page') ?? '1') || 1, 1);

	const [keys, logs] = await Promise.all([
		listApiKeys(),
		listApiV1Logs({
			...(keyId && { apiKeyId: keyId }),
			outcome,
			skip: (page - 1) * LOG_PAGE_SIZE,
			limit: LOG_PAGE_SIZE
		})
	]);

	return {
		keys: keys.map((key) => ({ _id: key._id.toString(), name: key.name })),
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
		hasMore: logs.hasMore,
		page,
		keyId,
		outcome
	};
}
