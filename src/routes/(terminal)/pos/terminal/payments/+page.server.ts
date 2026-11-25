import { error } from '@sveltejs/kit';
import { POS_OPERATOR_COOKIE, terminalKeyOf } from '$lib/server/api/pos-terminal';
import { operatorOfSession } from '$lib/server/arm-pos';
import { collections } from '$lib/server/database';

/** The payments this terminal took, most recent first, to open one and send its ticket again. */
export async function load(event) {
	const apiKey = await terminalKeyOf(event);
	if (!apiKey) {
		throw error(401, 'This device is not paired with the shop, or it was revoked.');
	}
	if (!(await operatorOfSession(event.cookies.get(POS_OPERATOR_COOKIE), apiKey._id))) {
		throw error(403, 'Sign in on the terminal first.');
	}

	const paid = await collections.posPayments
		.find({ 'device.apiKeyId': apiKey._id, 'payment.status': 'paid' })
		.sort({ createdAt: -1 })
		.limit(50)
		.toArray();

	return {
		paid: paid.map((p) => ({
			id: p._id,
			number: p.number,
			price: p.payment.price,
			method: p.payment.method,
			externalRef: p.externalRef,
			createdAt: p.createdAt
		}))
	};
}
