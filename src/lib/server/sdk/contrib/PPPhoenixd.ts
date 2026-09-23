import {
	isPhoenixdConfigured,
	phoenixdCreateInvoice,
	phoenixdLookupInvoice
} from '$lib/server/phoenixd';
import { addMinutes } from 'date-fns';
import { lightningLabel, LIGHTNING_PRESENTATION } from './presentations';
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

	settlementCurrency: () => 'SAT',

	presentation: LIGHTNING_PRESENTATION,

	// phoenixd refuses invoices valid for more than an hour.
	expiresIn: (timeoutMinutes) => addMinutes(new Date(), Math.min(timeoutMinutes, 60)),

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = params.toPay.amount;
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
