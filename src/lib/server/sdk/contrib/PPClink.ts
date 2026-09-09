import {
	isClinkConfigured,
	clinkCreateInvoice,
	clinkCheckInvoiceViaLightningPub
} from '$lib/server/clink';
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
 * CLINK is a *transport* layer, not a payment backend. Which node mints and
 * settles the bolt11 is chosen in the Admin > CLINK page:
 *
 * - 'processor' (default): invoices are created and settled by be-BOP's own
 *   configured Lightning processor (LND, Phoenixd, Blink…) — the same node that
 *   would back any other Lightning payment. checkPayment re-dispatches to that
 *   processor's checkPayment, which queries the node by payment hash.
 * - 'lightning-pub': invoices are minted by the merchant's Lightning.Pub node
 *   via its HTTP API; checkPayment queries that node's payment state
 *   (POST /api/user/payment/state) — node-backed, never echoing local state.
 *
 * Both branches yield a REAL payment hash persisted in the order payment doc
 * (invoiceId) alongside the backend discriminator (meta.backend / meta.bolt11).
 * Flow:
 *   1. createPayment() → mint a real bolt11 + payment hash on the configured
 *      backend. The bolt11 is served to the customer as a standard QR; the real
 *      payment hash is persisted in the order payment doc.
 *   2. Customer pays the bolt11 with any Lightning wallet (including CLINK-aware
 *      ones that obtained it via the Nostr relay).
 *   3. checkPayment() → settle against the node that actually holds the sats.
 *      Stateless and multi-process safe — no in-memory session store, no
 *      separate collection.
 *
 * Settlement note: CLINK does NOT mandate nDebit. Settlement is handled by the
 * merchant's configured backend via the bolt11 invoice, exactly as with any
 * other Lightning processor.
 */
export default {
	meta: { processor: 'clink', method: 'lightning', emoji: '⚡' },

	isEnabled: () => isClinkConfigured(),

	paymentPrice: lightningPaymentPrice,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = toSatoshis(params.toPay.amount, params.toPay.currency);
		const memo = lightningLabel(params.orderId, params.orderNumber);

		// Delegate invoice creation to the configured CLINK backend. This throws on
		// failure (relay/node down is NOT silently swallowed into a bare nOffer). If no
		// backend is available, checkout fails loudly rather than leaving the customer
		// with an unpayable order.
		const invoice = await clinkCreateInvoice({ amountSat: satoshis, memo });

		return {
			address: invoice.bolt11,
			invoiceId: invoice.paymentHash,
			// Which backend created/settles this invoice, so checkPayment can re-dispatch.
			// Lightning.Pub payments also persist the bolt11 (the node is queried by invoice).
			meta:
				invoice.backendProcessor === 'lightning-pub'
					? { backend: 'lightning-pub', bolt11: invoice.bolt11 }
					: { backend: invoice.backendProcessor },
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

		// `meta` is not part of OrderPayment's TS shape (it would send the Pojo mapped
		// type into infinite recursion via `ObjectId extends unknown`), but createPayment
		// results are spread into the persisted payment document, so the backend name
		// and bolt11 ARE present on stored CLINK payments.
		const meta = (
			payment as Order['payments'][number] & {
				meta?: { backend?: string; bolt11?: string };
			}
		).meta;
		const backendName = typeof meta?.backend === 'string' ? meta.backend : '';

		// Lightning.Pub backend: the invoice lives on the merchant's Lightning.Pub node.
		// Settlement is queried from that node (POST /api/user/payment/state) — the node
		// reports what it actually received, never an echo of the expected amount.
		if (backendName === 'lightning-pub') {
			const bolt11 = typeof meta?.bolt11 === 'string' ? meta.bolt11 : '';
			if (!bolt11) {
				throw new Error('Missing Lightning.Pub invoice on clink payment');
			}
			const expectedSats = toSatoshis(payment.price.amount, payment.price.currency);
			const state = await clinkCheckInvoiceViaLightningPub({
				bolt11,
				expectedAmountSat: expectedSats
			});
			if (!state.paid) {
				return { status: 'pending' };
			}
			return {
				status: 'paid',
				received: { amount: state.amountSat, currency: 'SAT' },
				fees: { amount: 0, currency: 'SAT' }
			};
		}

		// Processor backend: CLINK is a transport; settlement is verified by the backend
		// that holds the sats. Re-dispatch to that backend's own checkPayment with a
		// synthetic payment whose processor/invoiceId the backend understands (the real
		// payment hash).
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
