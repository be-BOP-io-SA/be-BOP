import { createHash } from 'crypto';
import { runtimeConfig } from './runtime-config';
import { relayUrlIssue } from './webhook-url-guard';
import { getNostrKeys } from './nostr';
import {
	ClinkSDK,
	finalizeEvent,
	nip44,
	verifyEvent,
	SimplePool,
	type NofferData,
	type NofferResponse,
	type AbstractSimplePool
} from '@shocknet/clink-sdk';

/**
 * CLINK (Common Lightning Interface for Nostr Keys) — server-side transport client.
 *
 * CLINK is a TRANSPORT layer, not a payment backend. Invoices are created and
 * settled by be-BOP's own configured Lightning processor (see clinkCreateInvoice).
 * This module handles only the Nostr side:
 *   1. Decode/validate the merchant's nOffer string
 *   2. Subscribe to the relay for incoming kind 21001 payment requests
 *   3. NIP-44 decrypt/validate requests, mint a bolt11 via the backend, respond
 *
 * Settlement is NOT detected here. be-BOP's existing 2s order poller calls
 * PPClink.checkPayment(), which re-dispatches to the underlying Lightning
 * processor and queries the node by payment hash — stateless and multi-process
 * safe, with no separate session collection or in-memory maps.
 */

const CLINK_EVENT_KIND = 21001;

// --- Hex / Uint8Array helpers ---

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

// --- NIP-44 helpers (nostr-tools 2.x uses conversation keys) ---

function clinkEncrypt(plaintext: string, privkeyHex: string, pubkeyHex: string): string {
	const convKey = nip44.getConversationKey(hexToBytes(privkeyHex), pubkeyHex);
	return nip44.encrypt(plaintext, convKey);
}

function clinkDecrypt(ciphertext: string, privkeyHex: string, senderPubkeyHex: string): string {
	const convKey = nip44.getConversationKey(hexToBytes(privkeyHex), senderPubkeyHex);
	return nip44.decrypt(ciphertext, convKey);
}

// --- nOffer decoding ---

export interface DecodedNoffer {
	pubkey: string;
	relay: string;
	offer: string;
	priceType: number;
	price?: number;
}

export function clinkDecodeNoffer(noffer: string): DecodedNoffer {
	const decoded = ClinkSDK.decodeBech32(noffer);
	if (decoded.type !== 'noffer') {
		throw new Error(`Expected noffer, got ${decoded.type}`);
	}
	return decoded.data as DecodedNoffer;
}

export function clinkValidateNoffer(noffer: string): { valid: boolean; error?: string } {
	try {
		const data = clinkDecodeNoffer(noffer);
		if (!data.pubkey || !/^[0-9a-f]{64}$/i.test(data.pubkey)) {
			return { valid: false, error: 'Invalid pubkey in nOffer' };
		}
		if (!data.relay) {
			return { valid: false, error: 'Missing relay in nOffer' };
		}
		try {
			new URL(data.relay);
		} catch {
			return { valid: false, error: 'Invalid relay URL in nOffer' };
		}
		if (!data.offer) {
			return { valid: false, error: 'Missing offer ID in nOffer' };
		}
		return { valid: true };
	} catch (err) {
		return {
			valid: false,
			error: err instanceof Error ? err.message : 'Failed to decode nOffer'
		};
	}
}

// --- Configuration checks ---

export function isClinkConfigured(): boolean {
	return !!(runtimeConfig.clink?.nOffer && runtimeConfig.clink?.relayUrl);
}

// --- BOLT11 validation ---

const BOLT11_NETWORKS: Record<string, string> = {
	bc: 'mainnet',
	tb: 'testnet',
	bcrt: 'regtest'
};

const BOLT11_MULTIPLIERS: Record<string, number> = {
	// multiplier applied to BTC to get sats
	m: 100_000, // milli-BTC
	u: 100, // micro-BTC
	n: 0.1, // nano-BTC (fractional sats)
	p: 0.0001 // pico-BTC (fractional sats)
};

/**
 * Minimal BOLT11 decoder — extracts network, amount (in sats) and timestamp
 * from the human-readable part without a full bolt11 library.
 */
export function decodeBolt11Light(
	bolt11: string
): { network: string; networkName: string; amountSat: number } | null {
	// Strip optional "lightning:" or "LIGHTNING:" URI prefix
	const raw = bolt11.replace(/^(lightning|LIGHTNING):/i, '').trim();
	const match = raw.match(/^(ln[a-z]{2,4})(\d+)([munp])?/i);
	if (!match) return null;

	const prefix = match[1].toLowerCase();
	const networkKey = prefix.slice(2); // strip "ln"
	const networkName = BOLT11_NETWORKS[networkKey];
	if (!networkName) return null;

	const digits = parseInt(match[2], 10);
	const multiplier = match[3]?.toLowerCase();
	const btcToSats = multiplier ? BOLT11_MULTIPLIERS[multiplier] : 1;
	const amountSat = Math.round(digits * btcToSats);

	return { network: networkKey, networkName, amountSat };
}

/**
 * Validate a bolt11 invoice returned by the backend.
 * Fixed-price invoices must match the expected amount EXACTLY — no tolerance.
 * This bolt11 was minted by our own backend for an exact amount, so any deviation
 * indicates a backend error or a tampered response.
 */
export function validateBolt11(
	bolt11: string,
	opts: { expectedNetwork?: string; expectedAmountSat?: number } = {}
): { valid: boolean; error?: string } {
	const decoded = decodeBolt11Light(bolt11);
	if (!decoded) {
		return { valid: false, error: 'Could not decode bolt11 invoice' };
	}

	if (opts.expectedNetwork && decoded.network !== opts.expectedNetwork) {
		return {
			valid: false,
			error: `Network mismatch: expected ${opts.expectedNetwork}, got ${decoded.network} (${decoded.networkName})`
		};
	}

	if (opts.expectedAmountSat !== undefined && decoded.amountSat > 0) {
		// Exact match: the backend minted this invoice for the requested amount.
		if (decoded.amountSat !== opts.expectedAmountSat) {
			return {
				valid: false,
				error: `Amount mismatch: expected ${opts.expectedAmountSat} sats, got ${decoded.amountSat} sats`
			};
		}
	}

	return { valid: true };
}

// --- CLINK relay subscription (server side) ---

/**
 * Subscribe to a Nostr relay for incoming CLINK kind 21001 events matching the merchant's pubkey.
 */
export function clinkSubscribeToRelay(params: {
	pool: AbstractSimplePool;
	relay: string;
	merchantPubkey: string;
	merchantPrivkey: string;
	onEvent: (
		request: NofferData,
		event: { id: string; pubkey: string; content: string; tags: string[][] }
	) => void;
}): { unsub: () => void } {
	const filter = {
		kinds: [CLINK_EVENT_KIND],
		'#p': [params.merchantPubkey],
		since: Math.floor(Date.now() / 1000) - 60
	};

	const sub = params.pool.subscribe([params.relay], filter, {
		onevent: async (evt: {
			id: string;
			pubkey: string;
			content: string;
			tags: string[][];
			sig?: string;
		}) => {
			try {
				if (!verifyEvent(evt as Parameters<typeof verifyEvent>[0])) {
					console.warn('CLINK: Received event with invalid signature, ignoring');
					return;
				}

				// Only customer payment requests are handled here. Events from the
				// merchant's own pubkey (or unreadable ones) are ignored — settlement
				// is verified against the node by the order poller, not via Nostr.
				let request: NofferData;
				try {
					request = JSON.parse(clinkDecrypt(evt.content, params.merchantPrivkey, evt.pubkey));
				} catch {
					// Not a customer payment request (e.g. an LP receipt) — ignore.
					return;
				}

				if (!request.offer) {
					console.warn('CLINK: Received request without offer field, ignoring');
					return;
				}

				params.onEvent(request, {
					id: evt.id,
					pubkey: evt.pubkey,
					content: evt.content,
					tags: evt.tags || []
				});
			} catch (err) {
				console.error(
					'CLINK: Failed to process incoming event:',
					err instanceof Error ? err.message : err
				);
			}
		}
	});

	return { unsub: () => sub.close() };
}

/**
 * Send a CLINK kind 21001 response event (encrypted with NIP-44).
 */
export async function clinkSendResponse(params: {
	pool: AbstractSimplePool;
	relay: string;
	senderPrivkey: string;
	senderPubkey: string;
	recipientPubkey: string;
	requestEventId: string;
	content: NofferResponse;
}): Promise<void> {
	const encrypted = clinkEncrypt(
		JSON.stringify(params.content),
		params.senderPrivkey,
		params.recipientPubkey
	);

	const unsignedEvent = {
		kind: CLINK_EVENT_KIND,
		created_at: Math.floor(Date.now() / 1000),
		content: encrypted,
		tags: [
			['p', params.recipientPubkey],
			['e', params.requestEventId],
			['clink_version', '1']
		],
		pubkey: params.senderPubkey
	};

	const signedEvent = finalizeEvent(unsignedEvent, hexToBytes(params.senderPrivkey));
	await params.pool.publish(
		[params.relay],
		signedEvent as Parameters<typeof params.pool.publish>[1]
	);
}

// --- CLINK error responses ---

export function clinkErrorResponse(
	code: 1 | 2 | 3 | 4 | 5,
	message: string,
	range?: { min: number; max: number }
): NofferResponse {
	return { code, error: message, ...(range ? { range } : {}) };
}

// --- Amount validation ---

export function clinkValidateAmount(
	requestedSats: number | undefined,
	priceType: number,
	offerPrice?: number
): { valid: boolean; response?: NofferResponse } {
	// Fixed price (type 0): amount must match exactly
	if (priceType === 0 && offerPrice !== undefined) {
		if (requestedSats === undefined || requestedSats !== offerPrice) {
			return {
				valid: false,
				response: clinkErrorResponse(5, `Fixed price requires ${offerPrice} sats`)
			};
		}
		return { valid: true };
	}

	// Variable price (type 1): amount is required
	if (priceType === 1) {
		if (requestedSats === undefined || requestedSats <= 0) {
			return {
				valid: false,
				response: clinkErrorResponse(5, 'Amount is required for variable-price offers', {
					min: 1,
					max: 100_000_000
				})
			};
		}
		return { valid: true };
	}

	// Spontaneous (type 2) or default: amount is optional but must be positive if provided
	if (requestedSats !== undefined && requestedSats <= 0) {
		return {
			valid: false,
			response: clinkErrorResponse(5, 'Amount must be positive', { min: 1, max: 100_000_000 })
		};
	}
	return { valid: true };
}

// --- Invoice creation ---

export interface ClinkInvoice {
	bolt11: string;
	paymentHash: string;
	/** The be-BOP Lightning processor that created (and will settle) this invoice */
	backendProcessor: string;
}

/**
 * Create a Lightning invoice via be-BOP's own configured Lightning backend.
 *
 * CLINK is a transport only. Delegating to be-BOP's own processor (LND, Phoenixd,
 * Blink…) yields a REAL payment hash and lets checkPayment reconcile against the
 * node that actually received the sats (per the SDK registry pattern). This throws
 * on failure rather than silently producing an unpayable order.
 */
export async function clinkCreateInvoice(params: {
	amountSat: number;
	memo: string;
}): Promise<ClinkInvoice> {
	const { getProcessorsForMethod } = await import('./sdk/pp');
	const processors = getProcessorsForMethod('lightning').filter(
		(pp) => pp.isEnabled() && pp.meta.processor !== 'clink'
	);
	if (!processors.length) {
		throw new Error('No non-CLINK lightning processor configured for CLINK invoice generation');
	}
	const backend = processors[0];

	const result = await backend.createPayment({
		orderId: `clink-${Date.now()}`,
		orderNumber: 0,
		paymentId: `clink-payment-${Date.now()}`,
		toPay: { amount: params.amountSat, currency: 'SAT' }
	});

	if (!result.address) {
		throw new Error('Lightning processor did not return an invoice');
	}

	return {
		bolt11: result.address,
		paymentHash: result.invoiceId ?? createHash('sha256').update(result.address).digest('hex'),
		backendProcessor: backend.meta.processor
	};
}

// --- Request handler ---

/**
 * Process an incoming CLINK payment request (a CLINK wallet fetching a bolt11
 * via the Nostr relay). Mints an invoice through the configured backend and
 * responds with the bolt11. No session bookkeeping — settlement is via the node.
 */
export async function clinkHandlePaymentRequest(params: {
	request: NofferData;
	event: { id: string; pubkey: string };
	merchantPubkey: string;
	merchantPrivkey: string;
	pool: AbstractSimplePool;
	relay: string;
	memo: string;
}): Promise<void> {
	const respond = async (response: NofferResponse) => {
		await clinkSendResponse({
			pool: params.pool,
			relay: params.relay,
			senderPrivkey: params.merchantPrivkey,
			senderPubkey: params.merchantPubkey,
			recipientPubkey: params.event.pubkey,
			requestEventId: params.event.id,
			content: response
		});
	};

	// Decode the merchant's nOffer for pricing + the canonical offer ID.
	let decoded: DecodedNoffer;
	try {
		decoded = clinkDecodeNoffer(runtimeConfig.clink.nOffer);
	} catch {
		await respond(clinkErrorResponse(2, 'Server configuration error'));
		return;
	}

	// Validate the request's offer against the merchant's CANONICAL offer from the
	// nOffer — not against the request's own offer field (which would compare an
	// input to itself and always pass).
	if (params.request.offer !== decoded.offer) {
		await respond(clinkErrorResponse(1, 'Invalid offer ID'));
		return;
	}

	// Validate amount
	const amountCheck = clinkValidateAmount(
		params.request.amount_sats,
		decoded.priceType,
		decoded.price
	);
	if (!amountCheck.valid) {
		await respond(amountCheck.response!);
		return;
	}

	const amountSat = params.request.amount_sats ?? decoded.price ?? 0;
	if (amountSat <= 0) {
		await respond(clinkErrorResponse(5, 'Amount is required', { min: 1, max: 100_000_000 }));
		return;
	}

	// Mint a bolt11 via the backend and hand it back over Nostr. The backend
	// processor stored the invoice; settlement is re-checked by PPClink.checkPayment.
	try {
		const invoice = await clinkCreateInvoice({ amountSat, memo: params.memo });
		await respond({ bolt11: invoice.bolt11 });
	} catch (err) {
		console.error('CLINK: Failed to create invoice:', err instanceof Error ? err.message : err);
		await respond(clinkErrorResponse(2, 'Failed to create invoice. Please try again.'));
	}
}

// --- Persistent listener ---

const activeListeners = new Map<string, { unsub: () => void; pool: AbstractSimplePool }>();

/**
 * Start a persistent CLINK listener on the configured relay, serving bolt11s to
 * CLINK wallets. Idempotent: a listener per relay is reused. Settlement is NOT
 * handled here — the order poller queries the node via PPClink.checkPayment.
 */
export async function clinkStartPersistentListener(): Promise<{ stop: () => void }> {
	if (!isClinkConfigured()) {
		throw new Error('CLINK is not configured');
	}

	const merchantPrivkey = getNostrKeys().privKeyHex;
	if (!merchantPrivkey) {
		throw new Error('Nostr private key not configured (required for CLINK)');
	}

	const merchantPubkey = getNostrKeys().pubKeyHex;
	const relay = runtimeConfig.clink.relayUrl!;

	// SSRF protection: reject relay URLs targeting private/internal networks
	const relayIssue = relayUrlIssue(relay);
	if (relayIssue) {
		throw new Error(`Unsafe CLINK relay URL: ${relayIssue}`);
	}

	// Reuse existing listener for this relay
	if (activeListeners.has(relay)) {
		return {
			stop: () => {
				activeListeners.get(relay)?.unsub();
				activeListeners.delete(relay);
			}
		};
	}

	const pool = new SimplePool();
	const { unsub } = clinkSubscribeToRelay({
		pool,
		relay,
		merchantPubkey,
		merchantPrivkey,
		onEvent: (request, event) => {
			clinkHandlePaymentRequest({
				request,
				event,
				merchantPubkey,
				merchantPrivkey,
				pool,
				relay,
				memo: runtimeConfig.brandName || 'be-BOP payment'
			}).catch((err) => {
				console.error('CLINK: Error handling payment request:', err);
			});
		}
	});

	activeListeners.set(relay, { unsub, pool });

	return {
		stop: () => {
			unsub();
			pool.destroy();
			activeListeners.delete(relay);
		}
	};
}

export function clinkStopAllListeners(): void {
	for (const [, listener] of activeListeners) {
		listener.unsub();
		listener.pool.destroy();
	}
	activeListeners.clear();
}
