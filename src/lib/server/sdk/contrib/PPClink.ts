import {
	isClinkConfigured,
	clinkDecodeNoffer,
	clinkStartPersistentListener,
	clinkRequestInvoice,
	setClinkSession,
	getClinkSession
} from '$lib/server/clink';
import { runtimeConfig } from '$lib/server/runtime-config';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { lightningPaymentPrice, lightningLabel } from '../pp';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

/**
 * CLINK Lightning processor.
 *
 * Uses CLINK (Nostr kind 21001 + NIP-44) as a transport option alongside
 * standard bolt11 Lightning. At order time we eagerly create a bolt11 invoice
 * via the configured Lightning backend and serve it directly to the customer
 * as a QR code. Any Lightning wallet can pay it.
 *
 * Additionally we start a CLINK Nostr listener so CLINK-aware wallets that
 * scan the merchant's nOffer receive the same bolt11 via the Nostr relay.
 *
 * Flow:
 *   1. createPayment() → creates bolt11, starts CLINK listener, returns bolt11 for QR
 *   2. Customer scans bolt11 QR → pays (standard Lightning)
 *      OR Customer scans nOffer with CLINK wallet → wallet gets bolt11 via Nostr → pays
 *   3. checkPayment() → delegates to underlying lightning processor
 *
 * nDebit Settlement Note:
 *   CLINK is a transport layer only — it does NOT mandate nDebit for settlement.
 *   Payment settlement is handled entirely by the merchant's default lightning
 *   processor (Blink, LND, Phoenixd, etc.) via the bolt11 invoice. The merchant
 *   receives sats on their existing lightning backend. No separate nDebit account
 *   or same-node settlement is required. If a merchant wants to use nDebit for
 *   same-node settlements (e.g. with ShockWallet), that is configured in their
 *   wallet, not in be-BOP.
 */
export default {
	meta: { processor: 'clink', method: 'lightning', emoji: '⚡' },

	isEnabled: () => isClinkConfigured(),

	paymentPrice: lightningPaymentPrice,

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const satoshis = toSatoshis(params.toPay.amount, params.toPay.currency);
		const memo = lightningLabel(params.orderId, params.orderNumber);

		// Decode the merchant's nOffer to get the offer ID for session tracking
		const decoded = clinkDecodeNoffer(runtimeConfig.clink.nOffer);

		// Start the persistent CLINK Nostr listener (reuses existing if already running)
		await clinkStartPersistentListener();

		// Request bolt11 from Lightning.Pub via CLINK kind 21001
		// The onReceipt callback fires when Lightning.Pub confirms the invoice was paid
		// (second kind 21001 event on the relay). The SDK keeps its subscription open
		// until the receipt arrives.
		let bolt11: string | null = null;
		try {
			const result = await clinkRequestInvoice({
				amountSat: satoshis,
				memo,
				onReceipt: () => {
					const session = getClinkSession(decoded.offer);
					if (session) {
						session.paid = true;
						console.log(`CLINK: Session ${decoded.offer} marked as paid via receipt`);
					}
				}
			});
			bolt11 = result.bolt11;
		} catch (err) {
			console.error('CLINK: Failed to request invoice from Lightning.Pub:', err);
		}

		if (bolt11) {
			// Store session keyed by offerId for checkPayment lookup
			await setClinkSession({
				offerId: decoded.offer,
				paymentHash: '', // bolt11 preimage not available from CLINK response
				bolt11,
				expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
			});
			return {
				address: bolt11,
				invoiceId: decoded.offer,
				processor: 'clink'
			};
		}

		// Fallback: return nOffer for CLINK wallets
		return {
			address: runtimeConfig.clink.nOffer,
			invoiceId: decoded.offer,
			processor: 'clink'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.invoiceId) {
			return { status: 'pending' };
		}

		const session = getClinkSession(payment.invoiceId);

		if (session && session.bolt11) {
			// Payment detection for CLINK-originated bolt11s relies solely on the
			// Nostr receipt callback (onReceipt from Lightning.Pub). The underlying
			// lightning processor cannot look up invoices it didn't create, so we
			// don't delegate to it. If the receipt is missed, the payment expires.
			if (session.paid) {
				return {
					status: 'paid',
					received: { amount: payment.price.amount, currency: 'SAT' }
				};
			}
		}

		if (payment.expiresAt && payment.expiresAt < new Date()) {
			return { status: 'expired' };
		}
		return { status: 'pending' };
	}
} satisfies PaymentProcessorDefinition;
