import { isClinkConfigured, clinkCreateInvoice } from '$lib/server/clink';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { getProcessor, lightningPaymentPrice, lightningLabel } from '../pp';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

/**
 * CLINK Lightning processor (transport over Nostr kind 21001 + NIP-44).
 *
 * CLINK is a *transport* layer, not a payment backend. Invoices are created and
 * settled by be-BOP's own configured Lightning processor (LND, Phoenixd, Blink…)
 * — the same node that would back any other Lightning payment. This gives us a
 * real payment hash and an authoritative, node-backed `checkPayment()` that
 * reconciles against the backend that actually received the sats (matching the
 * SDK registry pattern used by Blink/LND/Phoenixd/Taler/OSB from 96b3e59).
 *
 * Flow:
 *   1. createPayment() → delegate to the underlying Lightning processor →
 *      a real bolt11 + payment hash. The bolt11 is served to the customer as a
 *      standard QR; the real payment hash is persisted in the order payment doc
 *      (invoiceId) alongside the backend's processor name (meta.processorBackend).
 *   2. Customer pays the bolt11 with any Lightning wallet (including CLINK-aware
 *      ones that obtained it via the Nostr relay).
 *   3. checkPayment() → delegate to the same underlying processor's checkPayment,
 *      which queries the node for the invoice by payment hash. Stateless and
 *      multi-process safe — no in-memory session store, no separate collection.
 *
 * Settlement note: CLINK does NOT mandate nDebit. Settlement is handled by the
 * merchant's default Lightning backend via the bolt11 invoice, exactly as with any
 * other Lightning processor.
 */
export default {
	meta: { processor: 'clink', method: 'lightning', emoji: '⚡' },

	isEnabled: () => isClinkConfigured(),

	paymentPrice: lightningPaymentPrice,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = toSatoshis(params.toPay.amount, params.toPay.currency);
		const memo = lightningLabel(params.orderId, params.orderNumber);

		// Delegate invoice creation to be-BOP's own Lightning backend. This throws on
		// failure (relay/node down is NOT silently swallowed into a bare nOffer). If no
		// backend is available, checkout fails loudly rather than leaving the customer
		// with an unpayable order.
		const invoice = await clinkCreateInvoice({ amountSat: satoshis, memo });

		return {
			address: invoice.bolt11,
			invoiceId: invoice.paymentHash,
			// Which backend created/settles this invoice, so checkPayment can re-dispatch.
			meta: { backend: invoice.backendProcessor },
			processor: 'clink'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		_originalOrder: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.invoiceId) {
			throw new Error('Missing invoice ID on clink payment');
		}

		// CLINK is a transport: settlement is verified by the backend that holds the sats.
		// Re-dispatch to that backend's own checkPayment with a synthetic payment whose
		// processor/invoiceId the backend understands (the real payment hash).
		//
		// `meta` is not part of OrderPayment's TS shape (it would send the Pojo mapped
		// type into infinite recursion via `ObjectId extends unknown`), but createPayment
		// results are spread into the persisted payment document, so the backend name
		// IS present on stored CLINK payments.
		const meta = (payment as Order['payments'][number] & { meta?: { backend?: string } }).meta;
		const backendName = typeof meta?.backend === 'string' ? meta.backend : '';

		// If the backend name wasn't persisted (older payments), fall back to the
		// currently-configured default Lightning processor.
		const backend =
			(backendName && getProcessor(backendName)) ||
			getProcessor('lnd') ||
			getProcessor('phoenixd') ||
			getProcessor('blink');

		if (!backend) {
			throw new Error('No Lightning backend available to settle CLINK payment');
		}

		// Reuse the backend's checkPayment with the real payment hash.
		return backend.checkPayment(
			{
				...payment,
				processor: backend.meta.processor,
				invoiceId: payment.invoiceId
			} as Order['payments'][number],
			_originalOrder
		);
	}
} satisfies PaymentProcessorDefinition;
