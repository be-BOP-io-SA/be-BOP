import {
	getApiKeyPublic,
	revokeApiKey,
	serializeApiKeyPublic,
	setApiKeySuspended,
	updateApiKeyOwnOrdersOnly,
	updateApiKeyStreamSettings
} from '$lib/server/api/keys';
import { isStreamLifetimeTooLong, optionalStreamSetting } from '$lib/server/api/stream-settings';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { adminPrefix } from '$lib/server/admin';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
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
		openStreams: countOpenStreams(params.id)
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
				streamSettingsSaved: false,
				streamsReset: false,
				error: null
			};
		}

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

	saveStreamSettings: async ({ locals, params, request }) => {
		assertSuperAdmin(locals);

		if (!ObjectId.isValid(params.id)) {
			throw error(404, 'API key not found');
		}

		const formData = await request.formData();
		const parsed = z
			.object({
				maxConcurrentStreams: optionalStreamSetting,
				streamLifetimeSeconds: optionalStreamSetting
			})
			.safeParse({
				maxConcurrentStreams: String(formData.get('maxConcurrentStreams') ?? ''),
				streamLifetimeSeconds: String(formData.get('streamLifetimeSeconds') ?? '')
			});

		if (!parsed.success) {
			return fail(400, {
				alreadyRevoked: false,
				streamSettingsSaved: false,
				streamsReset: false,
				error: parsed.error.flatten()
			});
		}
		if (isStreamLifetimeTooLong(parsed.data.streamLifetimeSeconds)) {
			return fail(400, {
				alreadyRevoked: false,
				streamSettingsSaved: false,
				streamsReset: false,
				streamLifetimeTooLong: true,
				error: null
			});
		}

		const updated = await updateApiKeyStreamSettings(params.id, parsed.data);
		if (!updated) {
			throw error(404, 'API key not found');
		}

		return {
			alreadyRevoked: false,
			streamSettingsSaved: true,
			streamsReset: false,
			error: null
		};
	},

	/**
	 * Restrict the key to its own orders, or open every order to it again.
	 *
	 * The streams already open were filtered by the rule they opened under, so a change closes them:
	 * they reconnect under the new one.
	 */
	saveOrderAccess: async ({ locals, params, request }) => {
		assertSuperAdmin(locals);

		if (!ObjectId.isValid(params.id)) {
			throw error(404, 'API key not found');
		}

		const formData = await request.formData();
		const changed = await updateApiKeyOwnOrdersOnly(params.id, !!formData.get('ownOrdersOnly'));
		if (changed === null) {
			throw error(404, 'API key not found');
		}
		if (changed) {
			closeStreamsOfKey(params.id);
		}

		return {
			alreadyRevoked: false,
			streamSettingsSaved: false,
			streamsReset: false,
			orderAccessSaved: true,
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
			streamSettingsSaved: false,
			streamsReset: true,
			error: null
		};
	}
};
