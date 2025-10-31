import { generateXTicket, getCurrentPosSession } from '$lib/server/pos-sessions';
import { runtimeConfig } from '$lib/server/runtime-config';
import { error } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (!runtimeConfig.posSession.allowXTicketEditing) {
		throw error(403, 'X ticket editing is not enabled');
	}

	const session = await getCurrentPosSession();

	if (!session) {
		throw error(404, 'No active POS session');
	}

	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	const xTicketText = await generateXTicket({
		sessionId: session._id,
		user: {
			userId: locals.user._id,
			userLogin: locals.user.login,
			userAlias: locals.user.alias
		}
	});

	return {
		xTicketText,
		session: {
			openedAt: session.openedAt
		},
		allowEditing: runtimeConfig.posSession.allowXTicketEditing
	};
};
