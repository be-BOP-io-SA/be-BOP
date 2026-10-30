import { json } from '@sveltejs/kit';
import {
	checkWithdrawReadiness,
	markWithdrawPaid,
	releaseWithdraw,
	reserveLnurlWithdraw
} from '$lib/server/lnurlWithdraw';
import { phoenixdDecodeInvoice, phoenixdPayInvoice } from '$lib/server/phoenixd';

/** A refusal the wallet will display. Always HTTP 200: a 4xx shows up as "service offline". */
const refuse = (reason: string) => json({ status: 'ERROR', reason });

/**
 * The wallet comes back with its invoice, and the shop pays it.
 *
 * Order of operations matters here, because this is money leaving on a stranger's request. The
 * withdraw is claimed first — one attempt, whoever gets there first — then the node is asked
 * again whether it can pay, then the invoice is decoded and checked against the agreed range,
 * and only then is it paid. Any failure after the claim puts the withdraw back on offer.
 */
export const GET = async ({ params, url }) => {
	const k1 = url.searchParams.get('k1');
	const paymentRequest = url.searchParams.get('pr');

	if (!k1 || !paymentRequest) {
		return refuse('Missing k1 or pr');
	}

	const withdraw = await reserveLnurlWithdraw(params.id, k1);
	if (!withdraw) {
		return refuse('Withdraw is spent, expired or unknown');
	}

	const readiness = await checkWithdrawReadiness(withdraw.maxSat);
	if (!readiness.ready) {
		await releaseWithdraw(withdraw._id, readiness.blocker);
		return refuse(readiness.message);
	}

	let amountSat: number | undefined;
	try {
		({ amountSat } = await phoenixdDecodeInvoice(paymentRequest));
	} catch {
		await releaseWithdraw(withdraw._id, 'UNDECODABLE_INVOICE');
		return refuse('Invoice could not be decoded');
	}

	// An amountless invoice would let the node decide, which is the shop paying an open cheque.
	if (amountSat === undefined) {
		await releaseWithdraw(withdraw._id, 'AMOUNTLESS_INVOICE');
		return refuse('Invoice must carry an amount');
	}
	if (amountSat < withdraw.minSat || amountSat > withdraw.maxSat) {
		await releaseWithdraw(withdraw._id, 'AMOUNT_OUT_OF_RANGE');
		return refuse(`Invoice amount must be between ${withdraw.minSat} and ${withdraw.maxSat} sat`);
	}

	try {
		const paid = await phoenixdPayInvoice(paymentRequest);
		await markWithdrawPaid(withdraw._id, {
			paidSat: paid.recipientAmountSat,
			feeSat: paid.routingFeeSat,
			paymentHash: paid.paymentHash
		});
	} catch (err) {
		const reason =
			typeof err === 'object' && err && 'body' in err
				? (err as { body?: { message?: string } }).body?.message ?? 'Payment failed'
				: 'Payment failed';
		await releaseWithdraw(withdraw._id, reason);
		return refuse(reason);
	}

	return json({ status: 'OK' });
};
