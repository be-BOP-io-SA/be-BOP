import { isBlinkConfigured, blinkCreateInvoice, blinkLookupInvoice } from '$lib/server/blink';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { differenceInMinutes } from 'date-fns';
import { lightningPaymentPrice, lightningLabel } from '../pp';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

/**
 * Blink Lightning processor (receive-only, BTC-only).
 *
 * A single processor covering all three Blink receive modes (api-key custodial,
 * ln-address custodial, ln-address non-custodial/Spark). The mode is resolved from config
 * at createPayment time; at checkPayment time it is re-derived from the persisted payment:
 *   - checkoutId set  ⇒ Spark (LUD-21 verify URL)
 *   - otherwise       ⇒ GraphQL lookup (api-key or custodial, per current config)
 */
export default {
	meta: { processor: 'blink', method: 'lightning', emoji: '⚡' },

	isEnabled: () => isBlinkConfigured(),

	paymentPrice: lightningPaymentPrice,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = toSatoshis(params.toPay.amount, params.toPay.currency);
		const memo = lightningLabel(params.orderId, params.orderNumber);
		// Blink GraphQL expiry is in minutes; default to 60 when no expiry was provided.
		const expiresInMinutes = params.expiresAt
			? Math.max(1, differenceInMinutes(params.expiresAt, new Date()))
			: 60;
		const invoice = await blinkCreateInvoice({ amountSat: satoshis, memo, expiresInMinutes });
		return {
			address: invoice.paymentRequest,
			invoiceId: invoice.paymentHash,
			// Spark verify URL persisted here; its presence discriminates the mode at check time.
			...(invoice.verifyUrl && { checkoutId: invoice.verifyUrl }),
			processor: 'blink'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.invoiceId) {
			throw new Error('Missing invoice ID on blink payment');
		}
		const status = await blinkLookupInvoice(payment.invoiceId, payment.checkoutId);
		if (status === 'paid') {
			// The invoice was for a fixed sat amount; report the payment's sat price as received.
			return { status: 'paid', received: { amount: payment.price.amount, currency: 'SAT' } };
		}
		if (status === 'failed') {
			return { status: 'failed' };
		}
		if (status === 'expired' || (payment.expiresAt && payment.expiresAt < new Date())) {
			return { status: 'expired' };
		}
		return { status: 'pending' };
	}
} satisfies PaymentProcessorDefinition;
