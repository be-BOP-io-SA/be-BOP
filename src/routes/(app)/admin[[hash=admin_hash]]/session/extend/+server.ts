import { collections } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { addSeconds } from 'date-fns';

const EXTENSION_SECONDS = 30 * 60;

export const POST = async ({ locals }) => {
	if (!locals.user) {
		throw error(401, 'Not logged in');
	}

	const session = await collections.sessions.findOne({ sessionId: locals.sessionId });
	if (!session?.expireUserAt) {
		throw error(400, 'No admin session expiry to extend');
	}
	if (session.expireUserAt < new Date()) {
		throw error(401, 'Session already expired');
	}

	const nextExpireUserAt = addSeconds(session.expireUserAt, EXTENSION_SECONDS);
	await collections.sessions.updateOne(
		{ sessionId: locals.sessionId },
		{ $set: { expireUserAt: nextExpireUserAt, updatedAt: new Date() } }
	);

	return json({ expireUserAt: nextExpireUserAt.toISOString() });
};
