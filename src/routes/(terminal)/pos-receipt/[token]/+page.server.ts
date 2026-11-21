import { error } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { PROCESSORS } from '$lib/types/paymentProcessors';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { SATOSHIS_PER_BTC } from '$lib/types/Currency';

/** The receipt of a terminal payment, at the address its QR code gives the customer. */
export async function load({ params, setHeaders }) {
	const posPayment = await collections.posPayments.findOne({ receiptToken: params.token });
	if (!posPayment) {
		throw error(404, 'Receipt not found');
	}
	setHeaders({ 'cache-control': 'no-store' });

	const { payment } = posPayment;
	const settled = payment.received ?? payment.price;
	const sats = toSatoshis(settled.amount, settled.currency);
	const total = posPayment.amount.amount + posPayment.tip.amount;
	const identity = runtimeConfig.sellerIdentity;

	return {
		seller: {
			name: identity?.businessName || runtimeConfig.brandName,
			address: identity?.address,
			vatNumber: identity?.vatNumber
		},
		number: posPayment.number,
		status: payment.status,
		at: payment.paidAt ?? posPayment.createdAt,
		amount: posPayment.amount,
		tip: posPayment.tip,
		total: { amount: total, currency: posPayment.amount.currency },
		method: payment.method,
		processor: payment.processor ? PROCESSORS[payment.processor]?.label ?? payment.processor : '',
		transactionId: payment.transactions?.[0]?.id ?? payment.invoiceId,
		sats: Math.round(sats),
		// The rate of the payment: what one bitcoin was worth in the main currency.
		rate:
			sats > 0
				? { amount: (total * SATOSHIS_PER_BTC) / sats, currency: posPayment.amount.currency }
				: null,
		externalRef: posPayment.externalRef,
		device: posPayment.device.name
	};
}
