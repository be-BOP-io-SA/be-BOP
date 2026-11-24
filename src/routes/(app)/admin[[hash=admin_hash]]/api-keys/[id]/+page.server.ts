import {
	getApiKeyPublic,
	revokeApiKey,
	serializeApiKeyPublic,
	setApiKeySuspended,
	updateApiKeySettings
} from '$lib/server/api/keys';
import { clearSuspiciousFlag, listSuspiciousEvents } from '$lib/server/api/suspicious';
import {
	apiKeySettingsInput,
	apiKeySettingsSchema,
	streamSettingsRefusal
} from '$lib/server/api/stream-settings';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { adminPrefix } from '$lib/server/admin';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ObjectId } from 'mongodb';
import {
	closeStreamsOfKey,
	countOpenStreams
} from '$lib/server/api/v1/orders/paidStreamConnection';

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
		key: serializeApiKeyPublic(key),
		openStreams: countOpenStreams(params.id),
		suspiciousEvents: await listSuspiciousEvents(params.id)
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
			return {
				alreadyRevoked: true,
				saved: false,
				streamsReset: false,
				error: null
			};
		}
		// A revoked key is gone for good: what it still had open stops with it, at once.
		closeStreamsOfKey(params.id);

		throw redirect(303, `${adminPrefix()}/api-keys/${params.id}`);
	},

	/**
	 * Stop the key from being used, without revoking it. Its open streams are closed with it: they
	 * were let in before, and a suspended key must not keep receiving orders.
	 */
	suspend: async ({ locals, params }) => {
		assertSuperAdmin(locals);

		if (!ObjectId.isValid(params.id)) {
			throw error(404, 'API key not found');
		}
		if (!(await setApiKeySuspended(params.id, true))) {
			throw error(404, 'API key not found');
		}
		closeStreamsOfKey(params.id);

		throw redirect(303, `${adminPrefix()}/api-keys/${params.id}`);
	},

	/** Take the suspicious flag off, once an admin has looked at what raised it. */
	clearSuspicious: async ({ locals, params }) => {
		assertSuperAdmin(locals);

		if (!ObjectId.isValid(params.id)) {
			throw error(404, 'API key not found');
		}
		if (!(await clearSuspiciousFlag(params.id))) {
			throw error(404, 'API key not found');
		}

		throw redirect(303, `${adminPrefix()}/api-keys/${params.id}`);
	},

	reactivate: async ({ locals, params }) => {
		assertSuperAdmin(locals);

		if (!ObjectId.isValid(params.id)) {
			throw error(404, 'API key not found');
		}
		if (!(await setApiKeySuspended(params.id, false))) {
			throw error(404, 'API key not found');
		}

		throw redirect(303, `${adminPrefix()}/api-keys/${params.id}`);
	},

	/**
	 * Save everything the page lets the shop set on a key, from its one Save button: the two
	 * stream settings, whether the key only reaches its own orders, whether it may send an
	 * external id twice, and whether it may turn notifications off. Nothing is saved when a field
	 * is refused, and all of it is written at once.
	 */
	save: async ({ locals, params, request }) => {
		assertSuperAdmin(locals);

		if (!ObjectId.isValid(params.id)) {
			throw error(404, 'API key not found');
		}

		const parsed = apiKeySettingsSchema.safeParse(apiKeySettingsInput(await request.formData()));

		if (!parsed.success) {
			return fail(400, {
				alreadyRevoked: false,
				saved: false,
				streamsReset: false,
				...streamSettingsRefusal(parsed.error)
			});
		}

		const updated = await updateApiKeySettings(params.id, parsed.data);
		if (!updated) {
			throw error(404, 'API key not found');
		}
		// The streams already open were filtered by the rule they opened under: they reconnect
		// under the new one.
		if (updated.ownOrdersOnlyChanged) {
			closeStreamsOfKey(params.id);
		}

		return {
			alreadyRevoked: false,
			saved: true,
			streamsReset: false,
			error: null
		};
	},

	/**
	 * Close every stream open with this key and hand its places back at once, without restarting
	 * be-BOP. It is the recovery for a budget wedged shut by streams nobody is reading any more.
	 */
	resetStreams: async ({ locals, params }) => {
		assertSuperAdmin(locals);

		if (!ObjectId.isValid(params.id)) {
			throw error(404, 'API key not found');
		}
		if (!(await getApiKeyPublic(params.id))) {
			throw error(404, 'API key not found');
		}

		closeStreamsOfKey(params.id);

		return {
			alreadyRevoked: false,
			saved: false,
			streamsReset: true,
			error: null
		};
	}
};
