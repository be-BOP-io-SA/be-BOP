import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { error } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { generateZTicketText } from '$lib/server/pos-sessions';

export const load = async ({ params }: { params: { id: string } }) => {
	if (!runtimeConfig.posSession.enabled) {
		throw error(403, 'POS sessions are not enabled');
	}

	const session = await collections.posSessions.findOne({ _id: new ObjectId(params.id) });

	if (!session) {
		throw error(404, 'Session not found');
	}

	if (session.status !== 'closed') {
		throw error(400, 'Cannot view Z-ticket for active session');
	}

	const zTicketText = await generateZTicketText(session);

	return {
		zTicketText,
		session: {
			_id: session._id.toString(),
			openedAt: session.openedAt,
			closedAt: session.closedAt
		}
	};
};
