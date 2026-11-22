import { error } from '@sveltejs/kit';
import { POS_OPERATOR_COOKIE, terminalKeyOf } from '$lib/server/api/pos-terminal';
import { operatorOfSession } from '$lib/server/arm-pos';
import { collections } from '$lib/server/database';

/** The payments of this terminal left waiting when their screen was quit, to go back to them. */
export async function load(event) {
	const apiKey = await terminalKeyOf(event);
	if (!apiKey) {
		throw error(401, 'This device is not paired with the shop, or it was revoked.');
	}
	const operator = await operatorOfSession(event.cookies.get(POS_OPERATOR_COOKIE), apiKey._id);
	if (!operator) {
		throw error(403, 'Sign in on the terminal first.');
	}

	const pending = await collections.posPayments
		.find({ 'device.apiKeyId': apiKey._id, 'payment.status': 'pending' })
		.sort({ createdAt: -1 })
		.limit(50)
		.toArray();

	return {
		canCancel: operator.actions.includes('cancel'),
		pending: pending.map((p) => ({
			id: p._id.toHexString(),
			number: p.number,
			price: p.payment.price,
			method: p.payment.method,
			externalRef: p.externalRef,
			createdAt: p.createdAt
		}))
	};
}
