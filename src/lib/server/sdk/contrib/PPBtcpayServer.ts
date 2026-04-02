import {
	isBtcpayServerConfigured,
	btcpayCreateLnInvoice,
	btcpayGetLnInvoice
} from '$lib/server/btcpay-server';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { differenceInSeconds } from 'date-fns';
import { lightningPaymentPrice, lightningLabel } from '../pp';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

export default {
	meta: { processor: 'btcpay-server', method: 'lightning', emoji: '⚡' },

	isEnabled: () => isBtcpayServerConfigured(),

	paymentPrice: lightningPaymentPrice,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = toSatoshis(params.toPay.amount, params.toPay.currency);
		const label = lightningLabel(params.orderId, params.orderNumber);

		const invoice = await btcpayCreateLnInvoice({
			amount: `${satoshis * 1000}`,
			description: label,
			...(params.expiresAt && {
				expiry: differenceInSeconds(params.expiresAt, new Date())
			})
		});

		return {
			address: invoice.BOLT11,
			invoiceId: invoice.id,
			processor: 'btcpay-server'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.invoiceId) {
			throw new Error('Missing invoice ID on btcpay-server payment');
		}

		const invoice = await btcpayGetLnInvoice(payment.invoiceId);

		switch (invoice.status) {
			case 'Paid':
				return {
					status: 'paid',
					received: {
						amount: Number(invoice.amountReceived) / 1000,
						currency: 'SAT'
					}
				};
			case 'Expired':
				return { status: 'expired' };
			case 'Unpaid':
				return { status: 'pending' };
			default:
				console.log(
					`Unexpected status for BTCPay Server invoice ${payment.invoiceId}: ${invoice.status}`
				);
				invoice.status satisfies never;
				return { status: 'pending' };
		}
	}
} satisfies PaymentProcessorDefinition;
