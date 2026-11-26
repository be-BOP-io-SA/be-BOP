import { collections } from '$lib/server/database';
import { error, json } from '@sveltejs/kit';
import { addSeconds } from 'date-fns';
import { SESSION_EXPIRY_WARNING_MS, SESSION_EXTENSION_SECONDS } from '$lib/sessionExpiry';

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
	// One extension each time the banner shows up: once extended, the session is out of the
	// warning window again, so repeated clicks or requests are refused until the banner returns.
	if (session.expireUserAt.getTime() - Date.now() > SESSION_EXPIRY_WARNING_MS) {
		throw error(409, 'The session can only be extended when it is about to expire');
	}

	const nextExpireUserAt = addSeconds(session.expireUserAt, SESSION_EXTENSION_SECONDS);
	await collections.sessions.updateOne(
		{ sessionId: locals.sessionId },
		{ $set: { expireUserAt: nextExpireUserAt, updatedAt: new Date() } }
	);

	return json({ expireUserAt: nextExpireUserAt.toISOString() });
};
