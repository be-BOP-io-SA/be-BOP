import { createHash } from 'crypto';
import { z } from 'zod';
import { getNostrKeys } from './nostr';
import { runtimeConfig } from './runtime-config';
import { relayUrlIssue } from './webhook-url-guard';
import { collections } from './database';
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
 * CLINK (Common Lightning Interface for Nostr Keys) — server-side protocol client.
 *
 * Handles the merchant side of CLINK Offers:
 *   1. Decode merchant's nOffer string (from Lightning.Pub or similar)
 *   2. Subscribe to Nostr relays for incoming kind 21001 payment requests
 *   3. NIP-44 decrypt requests, validate amounts, generate invoices
 *   4. NIP-44 encrypt and publish kind 21001 responses with BOLT11 invoices
 *
 * Invoice generation delegates to the configured Lightning backend (processor or Lightning.Pub HTTP).
 * Settlement is detected by be-BOP's existing 2s order poller calling checkPayment().
 */

const CLINK_RELAY_TIMEOUT_MS = 15_000;
const CLINK_EVENT_KIND = 21001;

// --- Hex / Uint8Array helpers ---

function hexToBytes(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
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

// --- Session store (in-memory cache + MongoDB persistence) ---

export interface ClinkSession {
	offerId: string;
	paymentHash: string;
	bolt11: string;
	expiresAt: Date;
	paid?: boolean;
}

/** Fast in-memory cache — synced with MongoDB */
const activeSessions = new Map<string, ClinkSession>();

/** Load pending (unpaid) sessions from MongoDB into the in-memory cache on startup */
export async function clinkLoadPendingSessions(): Promise<void> {
	try {
		const pending = await collections.clinkSessions
			.find({ paid: false, expiresAt: { $gt: new Date() } })
			.toArray();
		for (const doc of pending) {
			activeSessions.set(doc.offerId, {
				offerId: doc.offerId,
				paymentHash: doc.paymentHash,
				bolt11: doc.bolt11,
				expiresAt: doc.expiresAt,
				paid: doc.paid
			});
		}
		console.log(`[CLINK] Loaded ${pending.length} pending sessions from database`);
	} catch (err) {
		console.error('[CLINK] Failed to load pending sessions:', err);
	}
}

export function getClinkSession(offerId: string): ClinkSession | undefined {
	return activeSessions.get(offerId);
}

/** Persist session to both in-memory cache and MongoDB */
export async function setClinkSession(session: ClinkSession): Promise<void> {
	activeSessions.set(session.offerId, session);
	try {
		await collections.clinkSessions.updateOne(
			{ offerId: session.offerId },
			{
				$set: {
					paymentHash: session.paymentHash,
					bolt11: session.bolt11,
					expiresAt: session.expiresAt,
					paid: session.paid ?? false,
					updatedAt: new Date()
				},
				$setOnInsert: {
					offerId: session.offerId,
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);
	} catch (err) {
		console.error(`[CLINK] Failed to persist session ${session.offerId}:`, err);
	}
}

/** Remove session from both in-memory cache and MongoDB */
export async function removeClinkSession(offerId: string): Promise<void> {
	activeSessions.delete(offerId);
	try {
		await collections.clinkSessions.deleteOne({ offerId });
	} catch (err) {
		console.error(`[CLINK] Failed to remove session ${offerId}:`, err);
	}
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

export function isLightningPubConfigured(): boolean {
	return !!(runtimeConfig.clink?.lightningPubEndpoint && runtimeConfig.clink?.lightningPubToken);
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
 *
 * Format: ln{network}{amount}{multiplier}
 * - network: bc (mainnet), tb (testnet), bcrt (regtest)
 * - amount: decimal digits (optional — 0 means any amount)
 * - multiplier: m/u/n/p applied to BTC (optional — absent means sats)
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
 * Validate a bolt11 invoice received from Lightning.Pub.
 * Checks network match and amount consistency.
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
		// Allow 1% tolerance for rounding
		const tolerance = Math.max(1, Math.floor(opts.expectedAmountSat * 0.01));
		if (Math.abs(decoded.amountSat - opts.expectedAmountSat) > tolerance) {
			return {
				valid: false,
				error: `Amount mismatch: expected ~${opts.expectedAmountSat} sats, got ${decoded.amountSat} sats`
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
	lightningPubPubkey?: string;
	onEvent: (request: NofferData, event: { id: string; pubkey: string; content: string }) => void;
}): { unsub: () => void } {
	const filter = {
		kinds: [CLINK_EVENT_KIND],
		'#p': [params.merchantPubkey],
		since: Math.floor(Date.now() / 1000) - 60
	};

	const sub = params.pool.subscribe([params.relay], filter, {
		onevent: async (evt: { id: string; pubkey: string; content: string; sig?: string }) => {
			try {
				if (!verifyEvent(evt as Parameters<typeof verifyEvent>[0])) {
					console.warn('CLINK: Received event with invalid signature, ignoring');
					return;
				}

				// Try to decrypt as a customer payment request first
				let decrypted: string;
				try {
					decrypted = clinkDecrypt(evt.content, params.merchantPrivkey, evt.pubkey);
				} catch {
					// If that fails and we know the Lightning.Pub pubkey, try as a receipt
					// (encrypted by Lightning.Pub, not the customer)
					if (params.lightningPubPubkey && evt.pubkey === params.lightningPubPubkey) {
						decrypted = clinkDecrypt(
							evt.content,
							params.merchantPrivkey,
							params.lightningPubPubkey
						);
					} else {
						throw new Error('Failed to decrypt event');
					}
				}

				const request = JSON.parse(decrypted) as NofferData;

				if (!request.offer) {
					console.warn('CLINK: Received request without offer field, ignoring');
					return;
				}

				params.onEvent(request, { id: evt.id, pubkey: evt.pubkey, content: evt.content });
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
	await params.pool.publish([params.relay], signedEvent as Parameters<typeof params.pool.publish>[1]);
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

/**
 * Create a Lightning invoice via the configured backend.
 * Supports: Lightning.Pub HTTP endpoint or delegation to the default lightning processor.
 */
export async function clinkCreateInvoice(params: {
	amountSat: number;
	memo: string;
}): Promise<{ bolt11: string; paymentHash: string }> {
	if (isLightningPubConfigured()) {
		return await clinkCreateInvoiceViaLightningPub(params);
	}
	return await clinkCreateInvoiceViaProcessor(params);
}

/**
 * Create invoice via Lightning.Pub HTTP API.
 */
async function clinkCreateInvoiceViaLightningPub(params: {
	amountSat: number;
	memo: string;
}): Promise<{ bolt11: string; paymentHash: string }> {
	const endpoint = runtimeConfig.clink.lightningPubEndpoint!.replace(/\/$/, '');
	const url = `${endpoint}/api/user/invoice/new`;

	const resp = await fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${runtimeConfig.clink.lightningPubToken}`
		},
		body: JSON.stringify({ amountSats: params.amountSat, memo: params.memo }),
		signal: AbortSignal.timeout(CLINK_RELAY_TIMEOUT_MS)
	});

	if (!resp.ok) {
		throw new Error(`Lightning.Pub invoice creation failed: ${resp.status} ${resp.statusText}`);
	}

	const json = z
		.object({
			invoice: z.string(),
			payment_hash: z.string().optional()
		})
		.parse(await resp.json());

	const paymentHash = json.payment_hash ?? createHash('sha256').update(json.invoice).digest('hex');
	return { bolt11: json.invoice, paymentHash };
}

/**
 * Create invoice via be-BOP's configured lightning processor.
 */
async function clinkCreateInvoiceViaProcessor(params: {
	amountSat: number;
	memo: string;
}): Promise<{ bolt11: string; paymentHash: string }> {
	const { getProcessorsForMethod } = await import('./sdk/pp');
	const processors = getProcessorsForMethod('lightning').filter(
		(pp) => pp.isEnabled() && pp.meta.processor !== 'clink'
	);
	if (!processors.length) {
		throw new Error('No non-CLINK lightning processor configured for CLINK invoice generation');
	}
	const pp = processors[0];

	const result = await pp.createPayment({
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
		paymentHash: result.invoiceId ?? createHash('sha256').update(result.address).digest('hex')
	};
}

/**
 * Request a bolt11 invoice from Lightning.Pub via CLINK kind 21001.
 *
 * The server acts as a CLINK client: it sends an Noffer request to the
 * merchant's pubkey (from the nOffer) via the nOffer's relay. Lightning.Pub
 * receives the request and responds with a bolt11 invoice.
 */
export async function clinkRequestInvoice(params: {
	amountSat: number;
	memo: string;
	onReceipt?: () => void;
}): Promise<{ bolt11: string }> {
	const decoded = clinkDecodeNoffer(runtimeConfig.clink.nOffer);
	const keys = getNostrKeys();

	// SSRF protection: reject relay URLs targeting private/internal networks
	const relayIssue = relayUrlIssue(decoded.relay);
	if (relayIssue) {
		throw new Error(`Unsafe relay URL in nOffer: ${relayIssue}`);
	}

	const privKeyBytes = new Uint8Array(Buffer.from(keys.privKeyHex, 'hex'));

	const pool = new SimplePool();
	const sdk = new ClinkSDK(
		{
			privateKey: privKeyBytes,
			relays: [decoded.relay],
			toPubKey: decoded.pubkey,
			defaultTimeoutSeconds: 30
		},
		pool
	);

	try {
		const receiptCallback = params.onReceipt
			? async () => {
					// Persist the paid flag to MongoDB
					try {
						await collections.clinkSessions.updateOne(
							{ offerId: decoded.offer },
							{ $set: { paid: true, updatedAt: new Date() } }
						);
					} catch (err) {
						console.error('[CLINK] Failed to persist paid status:', err);
					}
					clinkUnregisterReceiptCallback(decoded.offer);
					params.onReceipt!();
				}
			: undefined;

		// Register receipt callback with the persistent listener for relay-resilient receipt
		if (receiptCallback) {
			clinkRegisterReceiptCallback(decoded.offer, receiptCallback);
		}

		// Do NOT pass receiptCallback to sdk.Noffer() — the persistent listener handles
		// receipts exclusively to avoid competing subscriptions that intercept each other's events.
		const response = await sdk.Noffer(
			{
				offer: decoded.offer,
				amount_sats: params.amountSat,
				description: params.memo
			},
			undefined,
			30
		);

		if ('bolt11' in response) {
			// Validate the bolt11 invoice from Lightning.Pub
			const bolt11Check = validateBolt11(response.bolt11, {
				expectedAmountSat: params.amountSat
			});
			if (!bolt11Check.valid) {
				sdk.Stop();
				clinkUnregisterReceiptCallback(decoded.offer);
				throw new Error(`Invalid bolt11 from Lightning.Pub: ${bolt11Check.error}`);
			}

			// Always stop the SDK — receipt will be handled by the persistent listener
			sdk.Stop();
			return { bolt11: response.bolt11 };
		}
		sdk.Stop();
		throw new Error(`Lightning.Pub returned error: ${response.error}${response.range ? ` (range: ${response.range.min}-${response.range.max})` : ''}`);
	} catch (err) {
		sdk.Stop();
		clinkUnregisterReceiptCallback(decoded.offer);
		throw err;
	}
}

// --- Request handler ---

/**
 * Process an incoming CLINK payment request.
 */
export async function clinkHandlePaymentRequest(params: {
	request: NofferData;
	event: { id: string; pubkey: string };
	merchantPubkey: string;
	merchantPrivkey: string;
	pool: AbstractSimplePool;
	relay: string;
	offerId: string;
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

	// Validate offer ID
	if (params.request.offer !== params.offerId) {
		await respond(clinkErrorResponse(1, 'Invalid offer ID'));
		return;
	}

	// Decode merchant's nOffer for pricing info
	let decoded: DecodedNoffer;
	try {
		decoded = clinkDecodeNoffer(runtimeConfig.clink.nOffer);
	} catch {
		await respond(clinkErrorResponse(2, 'Server configuration error'));
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

	// Create invoice (or reuse pre-created one)
	try {
		const existing = activeSessions.get(params.offerId);
		let invoice;
		if (existing) {
			// Reuse pre-created invoice from createPayment()
			invoice = { bolt11: existing.bolt11, paymentHash: existing.paymentHash };
		} else {
			invoice = await clinkCreateInvoice({ amountSat, memo: params.memo });
		}

		// Store session for checkPayment() lookup
		activeSessions.set(params.offerId, {
			offerId: params.offerId,
			paymentHash: invoice.paymentHash,
			bolt11: invoice.bolt11,
			expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000)
		});

		await respond({ bolt11: invoice.bolt11 });
	} catch (err) {
		console.error('CLINK: Failed to create invoice:', err instanceof Error ? err.message : err);
		await respond(clinkErrorResponse(2, 'Failed to create invoice. Please try again.'));
	}
}

// --- Persistent listener ---

const activeListeners = new Map<string, { unsub: () => void; pool: AbstractSimplePool }>();

/**
 * Persistent map of receipt callbacks keyed by offerId.
 * Survives relay reconnections — the persistent listener fires these when a
 * matching kind 21001 receipt arrives, instead of relying on the one-shot
 * SDK subscription inside clinkRequestInvoice().
 */
const pendingReceiptCallbacks = new Map<string, () => void>();

/** Register a receipt callback for a pending CLINK session */
export function clinkRegisterReceiptCallback(offerId: string, callback: () => void): void {
	pendingReceiptCallbacks.set(offerId, callback);
}

/** Unregister a receipt callback (e.g. after it fires or on cleanup) */
export function clinkUnregisterReceiptCallback(offerId: string): void {
	pendingReceiptCallbacks.delete(offerId);
}

/** Check if a receipt callback is registered for an offer */
export function clinkHasReceiptCallback(offerId: string): boolean {
	return pendingReceiptCallbacks.has(offerId);
}

/**
 * Start a persistent CLINK listener on the configured relay.
 */
export async function clinkStartPersistentListener(): Promise<{ stop: () => void }> {
	if (!isClinkConfigured()) {
		throw new Error('CLINK is not configured');
	}

	// Load pending sessions from MongoDB into the in-memory cache on startup
	await clinkLoadPendingSessions();

	const merchantPrivkey = getNostrKeys().privKeyHex;
	if (!merchantPrivkey) {
		throw new Error('Nostr private key not configured (required for CLINK)');
	}

	const decoded = clinkDecodeNoffer(runtimeConfig.clink.nOffer);
	const merchantPubkey = decoded.pubkey;
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
		lightningPubPubkey: decoded.pubkey,
		onEvent: (request, event) => {
			// Check if this event is a receipt from Lightning.Pub (not a new payment request).
			// Lightning.Pub's pubkey is embedded in the nOffer.
			const lpPubkey = decoded.pubkey;
			if (event.pubkey === lpPubkey && pendingReceiptCallbacks.has(request.offer)) {
				const cb = pendingReceiptCallbacks.get(request.offer)!;
				pendingReceiptCallbacks.delete(request.offer);
				cb();
				return;
			}

			clinkHandlePaymentRequest({
				request,
				event,
				merchantPubkey,
				merchantPrivkey,
				pool,
				relay,
				offerId: request.offer,
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

export async function clinkCleanupSessions(): Promise<void> {
	const now = new Date();
	// Clean in-memory cache
	for (const [offerId, session] of activeSessions) {
		if (session.expiresAt < now) {
			activeSessions.delete(offerId);
		}
	}
	// Clean MongoDB (TTL index handles this, but belt-and-suspenders)
	try {
		await collections.clinkSessions.deleteMany({ expiresAt: { $lt: now } });
	} catch (err) {
		console.error('[CLINK] Failed to cleanup expired sessions:', err);
	}
}

if (typeof setInterval !== 'undefined') {
	setInterval(clinkCleanupSessions, 5 * 60 * 1000);
}
