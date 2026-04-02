import { isLndConfigured, lndCreateInvoice, lndLookupInvoice } from '$lib/server/lnd';
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
	meta: { processor: 'lnd', method: 'lightning', emoji: '⚡' },

	isEnabled: () => isLndConfigured(),

	paymentPrice: lightningPaymentPrice,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = toSatoshis(params.toPay.amount, params.toPay.currency);
		const label = lightningLabel(params.orderId, params.orderNumber);

		const invoice = await lndCreateInvoice(satoshis, {
			...(params.expiresAt && {
				expireAfterSeconds: differenceInSeconds(params.expiresAt, new Date())
			}),
			label
		});

		return {
			address: invoice.payment_request,
			invoiceId: invoice.r_hash,
			processor: 'lnd'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.invoiceId) {
			throw new Error('Missing invoice ID on lnd payment');
		}

		const lndInvoice = await lndLookupInvoice(payment.invoiceId);

		if (lndInvoice.state === 'SETTLED') {
			return {
				status: 'paid',
				received: {
					amount: lndInvoice.amt_paid_sat,
					currency: 'SAT'
				}
			};
		}

		if (lndInvoice.state === 'CANCELED') {
			return { status: 'expired' };
		}

		// ACCEPTED or OPEN — still pending
		return { status: 'pending' };
	}
} satisfies PaymentProcessorDefinition;
