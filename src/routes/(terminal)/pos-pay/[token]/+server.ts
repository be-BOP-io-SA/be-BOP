import { error, redirect } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { paypalPosApprovalUrl } from '$lib/server/pos-payments';

/**
 * The address in the QR code of a PayPal payment of a terminal: it sends the customer who scanned
 * it to PayPal, with an order made for their phone.
 */
export async function GET({ params, request }) {
	const posPayment = await collections.posPayments.findOne({ receiptToken: params.token });
	if (!posPayment || posPayment.payment.method !== 'paypal') {
		throw error(404, 'Payment not found');
	}
	const { status, expiresAt } = posPayment.payment;
	if (status !== 'pending' || (expiresAt && expiresAt < new Date())) {
		throw redirect(303, `/pos-receipt/${posPayment.receiptToken}`);
	}

	let url: string;
	try {
		url = await paypalPosApprovalUrl(posPayment, request.headers.get('user-agent') || undefined);
	} catch (err) {
		console.error(`[pos pay] PayPal order of PoS payment ${posPayment.number} failed`, err);
		throw error(502, 'PayPal is unavailable, choose another payment method');
	}
	throw redirect(302, url);
}
