import { error, fail } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { POS_OPERATOR_COOKIE, terminalKeyOf } from '$lib/server/api/pos-terminal';
import { operatorOfSession } from '$lib/server/arm-pos';
import { collections } from '$lib/server/database';
import { cancelPosPayment, checkPosPayment, settleOverpayment } from '$lib/server/pos-payments';
import { getConfirmationBlocks } from '$lib/server/getConfirmationBlocks';
import { ORIGIN } from '$lib/server/env-config';
import type { RequestEvent } from '@sveltejs/kit';

/** The payment, if this terminal took it. */
async function ownPayment(event: RequestEvent<{ id: string }>) {
	const apiKey = await terminalKeyOf(event);
	if (!apiKey) {
		throw error(401, 'This device is not paired with the shop, or it was revoked.');
	}
	if (!ObjectId.isValid(event.params.id)) {
		throw error(404, 'Payment not found');
	}
	const posPayment = await collections.posPayments.findOne({ _id: new ObjectId(event.params.id) });
	if (!posPayment || !posPayment.device.apiKeyId.equals(apiKey._id)) {
		throw error(404, 'Payment not found');
	}
	return { posPayment, apiKey };
}

/** What the operator signed in on this terminal may do, or nothing. */
async function operatorActions(event: RequestEvent<{ id: string }>, apiKeyId: ObjectId) {
	return (await operatorOfSession(event.cookies.get(POS_OPERATOR_COOKIE), apiKeyId))?.actions ?? [];
}

export async function load(event) {
	// Asked again on each refresh of the screen, so the terminal does not wait for the poller.
	const own = await ownPayment(event);
	const posPayment = await checkPosPayment(own.posPayment).catch(() => own.posPayment);
	const { payment } = posPayment;
	const actions = await operatorActions(event, own.apiKey._id);

	return {
		number: posPayment.number,
		amount: posPayment.amount,
		tip: posPayment.tip,
		externalRef: posPayment.externalRef,
		method: payment.method,
		price: payment.price,
		status: payment.status,
		address: payment.address,
		// Only to this terminal: what its Tap to Pay module collects the card payment with.
		cardClientSecret: payment.method === 'card' ? payment.clientSecret : undefined,
		awaitingConfirmation: payment.awaitingConfirmation ?? false,
		confirmationBlocks: payment.method === 'bitcoin' ? getConfirmationBlocks(payment.price) : 0,
		overpayment: posPayment.overpayment,
		canCancel: actions.includes('cancel'),
		canRefund: actions.includes('refund'),
		receiptUrl: `${ORIGIN.replace(/\/+$/, '')}/pos-receipt/${posPayment.receiptToken}`
	};
}

export const actions = {
	async cancel(event) {
		const { posPayment, apiKey } = await ownPayment(event);
		if (!(await operatorActions(event, apiKey._id)).includes('cancel')) {
			return fail(403, {});
		}
		await cancelPosPayment(posPayment);
	},
	async overpayment(event) {
		const { posPayment, apiKey } = await ownPayment(event);
		const treatment = (await event.request.formData()).get('treatment');
		if (treatment !== 'tip' && treatment !== 'refund') {
			return fail(400, {});
		}
		if (treatment === 'refund' && !(await operatorActions(event, apiKey._id)).includes('refund')) {
			return fail(403, {});
		}
		await settleOverpayment(posPayment, treatment);
	}
};
