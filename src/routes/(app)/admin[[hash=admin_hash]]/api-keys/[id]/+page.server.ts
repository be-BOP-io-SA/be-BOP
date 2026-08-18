import { getApiKeyPublic, revokeApiKey, serializeApiKeyPublic } from '$lib/server/api/keys';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { adminPrefix } from '$lib/server/admin';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ObjectId } from 'mongodb';

function assertSuperAdmin(locals: App.Locals) {
	if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
		throw error(403, 'Forbidden. Only Super Admin can access this page !');
	}
}

export async function load({ locals, params }) {
	assertSuperAdmin(locals);

	if (!ObjectId.isValid(params.id)) {
		throw error(404, 'API key not found');
	}

	const key = await getApiKeyPublic(params.id);
	if (!key) {
		throw error(404, 'API key not found');
	}

	return {
		key: serializeApiKeyPublic(key)
	};
}

export const actions: Actions = {
	revoke: async ({ locals, params }) => {
		assertSuperAdmin(locals);

		if (!ObjectId.isValid(params.id)) {
			throw error(404, 'API key not found');
		}

		const revoked = await revokeApiKey(params.id);
		if (!revoked) {
			const existing = await getApiKeyPublic(params.id);
			if (!existing) {
				throw error(404, 'API key not found');
			}
			// Already revoked — stay on page
			return { alreadyRevoked: true };
		}

		throw redirect(303, `${adminPrefix()}/api-keys/${params.id}`);
	}
};
