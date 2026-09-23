import {
	getApiKeyPublic,
	revokeApiKey,
	serializeApiKeyPublic,
	updateApiKeyStreamSettings
} from '$lib/server/api/keys';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { adminPrefix } from '$lib/server/admin';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import {
	countOpenStreams,
	resetStreamBudget
} from '$lib/server/api/v1/orders/paidStreamConnection';

/**
 * An empty field is an answer, not a missing one: it means "no ceiling" for the budget and "never
 * close it" for the lifetime, and it is stored as absent rather than as zero.
 */
const optionalCount = z
	.string()
	.trim()
	.transform((raw) => (raw === '' ? null : Number(raw)))
	.refine((value) => value === null || (Number.isInteger(value) && value > 0), {
		message: 'Leave empty, or enter a whole number greater than zero'
	});

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

	saveStreamSettings: async ({ locals, params, request }) => {
		assertSuperAdmin(locals);

		if (!ObjectId.isValid(params.id)) {
			throw error(404, 'API key not found');
		}

		const formData = await request.formData();
		const parsed = z
			.object({ maxConcurrentStreams: optionalCount, streamLifetimeSeconds: optionalCount })
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
	 * Hand every place held by this key back at once, without restarting be-BOP.
	 *
	 * The budget is a count and nothing else, so this clears it outright. It is the recovery for a
	 * budget wedged shut by streams nobody is reading any more.
	 */
	resetStreams: async ({ locals, params }) => {
		assertSuperAdmin(locals);

		if (!ObjectId.isValid(params.id)) {
			throw error(404, 'API key not found');
		}
		if (!(await getApiKeyPublic(params.id))) {
			throw error(404, 'API key not found');
		}

		resetStreamBudget(params.id);

		return {
			alreadyRevoked: false,
			streamSettingsSaved: false,
			streamsReset: true,
			error: null
		};
	}
};
