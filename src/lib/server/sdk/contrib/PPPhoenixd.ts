import {
	isPhoenixdConfigured,
	phoenixdCreateInvoice,
	phoenixdLookupInvoice,
	warnOnAlmostFullChannels
} from '$lib/server/phoenixd';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { lightningPaymentPrice, lightningLabel } from '../pp';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

export default {
	meta: { processor: 'phoenixd', method: 'lightning', emoji: '⚡' },

	isEnabled: () => isPhoenixdConfigured(),

	paymentPrice: lightningPaymentPrice,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = toSatoshis(params.toPay.amount, params.toPay.currency);
		const label = lightningLabel(params.orderId, params.orderNumber);
		const invoice = await phoenixdCreateInvoice(satoshis, label, params.orderId);
		return {
			address: invoice.payment_request,
			invoiceId: invoice.r_hash,
			processor: 'phoenixd'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.invoiceId) {
			throw new Error('Missing invoice ID on phoenixd payment');
		}
		const invoice = await phoenixdLookupInvoice(payment.invoiceId);
		if (invoice.isPaid) {
			// Receiving is what eats the room, so this is the moment to look. Detached and caught: a
			// node that answers badly must never hold back a payment that did go through.
			warnOnAlmostFullChannels().catch((err) =>
				console.error('[phoenixd] could not check channel capacity', err)
			);
			return {
				status: 'paid',
				received: { amount: invoice.receivedSat, currency: 'SAT' },
				fees: { amount: invoice.feesSat, currency: 'SAT' }
			};
		}
		if (payment.expiresAt && payment.expiresAt < new Date()) {
			return { status: 'expired' };
		}
		return { status: 'pending' };
	}
} satisfies PaymentProcessorDefinition;
