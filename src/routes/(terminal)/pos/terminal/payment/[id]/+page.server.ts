import { error, fail } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { terminalKeyOf } from '$lib/server/api/pos-terminal';
import { collections } from '$lib/server/database';
import { checkPosPayment, settleOverpayment } from '$lib/server/pos-payments';
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
	return posPayment;
}

export async function load(event) {
	// Asked again on each refresh of the screen, so the terminal does not wait for the poller.
	const posPayment = await checkPosPayment(await ownPayment(event)).catch(() => ownPayment(event));
	const { payment } = posPayment;

	return {
		number: posPayment.number,
		amount: posPayment.amount,
		tip: posPayment.tip,
		externalRef: posPayment.externalRef,
		method: payment.method,
		price: payment.price,
		status: payment.status,
		address: payment.address,
		awaitingConfirmation: payment.awaitingConfirmation ?? false,
		confirmationBlocks: payment.method === 'bitcoin' ? getConfirmationBlocks(payment.price) : 0,
		overpayment: posPayment.overpayment,
		receiptUrl: `${ORIGIN.replace(/\/+$/, '')}/pos-receipt/${posPayment.receiptToken}`
	};
}

export const actions = {
	async overpayment(event) {
		const posPayment = await ownPayment(event);
		const treatment = (await event.request.formData()).get('treatment');
		if (treatment !== 'tip' && treatment !== 'refund') {
			return fail(400, {});
		}
		await settleOverpayment(posPayment, treatment);
	}
};
