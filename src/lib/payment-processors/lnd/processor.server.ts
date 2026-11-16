import { isLndConfigured, lndCreateInvoice, lndLookupInvoice } from '$lib/server/lnd';
import { differenceInSeconds } from 'date-fns';
import { lightningLabel, LIGHTNING } from '$lib/server/sdk/presentations';
import {
	definePaymentProcessor,
	type CreatePaymentParams,
	type CreatePaymentResult,
	type CheckPaymentResult
} from '$lib/server/sdk/pp';
import type { Order } from '$lib/types/Order';
import declaration from './declaration';

export default definePaymentProcessor(declaration, {
	...LIGHTNING,

	isEnabled: () => isLndConfigured(),

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = params.toPay.amount;
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
});
