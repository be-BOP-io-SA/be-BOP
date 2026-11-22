import { error } from '@sveltejs/kit';
import { POS_OPERATOR_COOKIE, terminalKeyOf } from '$lib/server/api/pos-terminal';
import { operatorOfSession } from '$lib/server/arm-pos';
import { generateXTicket, getCurrentPosSession } from '$lib/server/pos-sessions';

/** The X ticket of the open till session, for an operator allowed to read it. */
export async function load(event) {
	const apiKey = await terminalKeyOf(event);
	if (!apiKey) {
		throw error(401, 'This device is not paired with the shop, or it was revoked.');
	}
	const operator = await operatorOfSession(event.cookies.get(POS_OPERATOR_COOKIE), apiKey._id);
	if (!operator?.actions.includes('xReport')) {
		throw error(403, 'You are not allowed to read the X ticket.');
	}

	const session = await getCurrentPosSession();
	if (!session) {
		return { ticket: null };
	}

	return {
		ticket: await generateXTicket({
			sessionId: session._id,
			user: { userId: operator._id, userLogin: operator.alias, userAlias: operator.alias },
			terminal: true
		})
	};
}
