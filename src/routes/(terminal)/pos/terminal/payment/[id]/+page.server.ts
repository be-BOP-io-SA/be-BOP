import { error, fail, redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { POS_OPERATOR_COOKIE, terminalKeyOf } from '$lib/server/api/pos-terminal';
import { operatorOfSession } from '$lib/server/arm-pos';
import { collections } from '$lib/server/database';
import {
	cancelPosPayment,
	checkPosPayment,
	posReceiptUrl,
	sendPosReceiptByEmail,
	sendPosReceiptByNostr,
	settleOverpayment
} from '$lib/server/pos-payments';
import { validateEmailOrNpub } from '$lib/server/nostr';
import { availableContactModes } from '$lib/server/contact-modes';
import { getConfirmationBlocks } from '$lib/server/getConfirmationBlocks';
import { BoltCardError, payInvoiceWithBoltCard } from '$lib/server/boltcard';
import { toSatoshis } from '$lib/utils/toSatoshis';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * The Lightning processors whose invoices a Bolt Card was seen paying. With phoenixd, the provider of
 * the card found no route to the shop's node.
 */
const BOLT_CARD_PROCESSORS: readonly string[] = ['swiss-bitcoin-pay', 'btcpay-server', 'blink'];

function takesBoltCard(payment: { method: string; processor?: string; address?: string }) {
	return (
		payment.method === 'lightning' &&
		!!payment.address &&
		!!payment.processor &&
		BOLT_CARD_PROCESSORS.includes(payment.processor)
	);
}

/** The payment, if this terminal took it. */
async function ownPayment(event: RequestEvent<{ id: string }>) {
	const apiKey = await terminalKeyOf(event);
	if (!apiKey) {
		throw error(401, 'This device is not paired with the shop, or it was revoked.');
	}
	const posPayment = await collections.posPayments.findOne({ _id: event.params.id });
	if (!posPayment || !posPayment.device.apiKeyId.equals(apiKey._id)) {
		throw error(404, 'Payment not found');
	}
	return { posPayment, apiKey };
}

/** The operator signed in on this terminal, if any. */
function operatorOn(event: RequestEvent<{ id: string }>, apiKeyId: ObjectId) {
	return operatorOfSession(event.cookies.get(POS_OPERATOR_COOKIE), apiKeyId);
}

/** What the operator signed in on this terminal may do, or nothing. */
async function operatorActions(event: RequestEvent<{ id: string }>, apiKeyId: ObjectId) {
	return (await operatorOn(event, apiKeyId))?.actions ?? [];
}

export async function load(event) {
	// Asked again on each refresh of the screen, so the terminal does not wait for the poller.
	const own = await ownPayment(event);
	const posPayment = await checkPosPayment(own.posPayment).catch(() => own.posPayment);
	const { payment } = posPayment;
	const actions = await operatorActions(event, own.apiKey._id);

	return {
		id: posPayment._id,
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
		boltCard: takesBoltCard(payment),
		canRefund: actions.includes('refund'),
		receiptUrl: posReceiptUrl(posPayment)
	};
}

export const actions = {
	async receipt(event) {
		const { posPayment } = await ownPayment(event);
		if (posPayment.payment.status !== 'paid') {
			throw error(400, 'Payment is not paid');
		}
		const data = await event.request.formData();
		// Which button sent it, so that the answer shows under that button.
		const channel = data.get('channel') === 'nostr' ? ('nostr' as const) : ('email' as const);
		// One field, as on the shop: an e-mail or an npub, among the shop's contact modes.
		const address = validateEmailOrNpub(data.get('address'), availableContactModes());
		if ('error' in address) {
			return fail(400, { receiptError: address.error, channel });
		}
		if (address.kind === 'email') {
			await sendPosReceiptByEmail(posPayment, address.address);
		} else {
			await sendPosReceiptByNostr(posPayment, address.address);
		}
		return { receiptSent: true, channel };
	},
	async boltcard(event) {
		const { posPayment, apiKey } = await ownPayment(event);
		if (!(await operatorOn(event, apiKey._id))) {
			return fail(403, {});
		}
		const { payment } = posPayment;
		if (payment.status !== 'pending' || !payment.address || !takesBoltCard(payment)) {
			throw error(400, 'Payment does not take a Bolt Card');
		}
		const link = String((await event.request.formData()).get('link') ?? '');
		try {
			await payInvoiceWithBoltCard({
				link,
				invoice: payment.address,
				amountSat: toSatoshis(payment.price)
			});
		} catch (err) {
			// The provider's reason is for the operator, behind the "An error occurred" notice.
			if (!(err instanceof BoltCardError)) {
				throw err;
			}
			return fail(400, { boltCardError: err.message.slice(0, 300) });
		}
		return { boltCardSent: true };
	},
	async cancel(event) {
		const { posPayment, apiKey } = await ownPayment(event);
		// Any operator signed in on the terminal: a waiting payment is the only screen it has, and
		// leaving it without a way out would leave it waiting for good.
		const operator = await operatorOn(event, apiKey._id);
		if (!operator) {
			return fail(403, {});
		}
		await cancelPosPayment(posPayment, { userId: operator._id, alias: operator.alias });
		// Another method for the same sale.
		if ((await event.request.formData()).get('substitute')) {
			throw redirect(303, `/pos/terminal?retry=${posPayment._id}`);
		}
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
