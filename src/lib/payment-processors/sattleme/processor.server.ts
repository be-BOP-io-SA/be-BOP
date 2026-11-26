import type { Order } from '$lib/types/Order';
import { LIGHTNING_PRESENTATION } from '$lib/server/sdk/presentations';
import {
	definePaymentProcessor,
	type CheckPaymentResult,
	type CreatePaymentParams,
	type CreatePaymentResult
} from '$lib/server/sdk/pp';
import declaration from './declaration';
import {
	checkSattlemePayment,
	createSattlemeInvoice,
	isConnectionTest,
	sattlemeExpiresIn,
	testSattlemeConnection
} from './sattleme.server';

/**
 * The Lightning method through sattle.me: its QR code is the Lightning invoice alone. From
 * 1 000 sats sattle.me also leases a deposit address for the order, which this method never
 * shows: the Bitcoin method (`sattleme-onchain`) is the one that pays on-chain.
 */
export default definePaymentProcessor(declaration, {
	presentation: LIGHTNING_PRESENTATION,

	settlementCurrency: () => 'SAT',

	expiresIn: sattlemeExpiresIn,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		if (isConnectionTest(params)) {
			await testSattlemeConnection();
			return { processor: 'sattleme' };
		}

		const invoice = await createSattlemeInvoice(params);
		if (!invoice.bolt11) {
			// Outside the bounds of the merchant's Lightning address: on-chain only.
			throw new Error(
				`sattle.me cannot make a Lightning invoice of ${invoice.sats} sats for this merchant`
			);
		}

		return {
			address: invoice.bolt11,
			invoiceId: invoice.paymentHash ?? invoice.ref,
			processor: 'sattleme',
			meta: { invoice }
		};
	},

	checkPayment(payment: Order['payments'][number], order: Order): Promise<CheckPaymentResult> {
		// The rest of an on-chain underpayment gets an invoice of its own: it is the one to copy.
		return checkSattlemePayment(order, payment, (rest) => rest.bolt11);
	}
});
