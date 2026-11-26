import {
	InvoicePendingError,
	Sattleme,
	SattlemeError,
	type DeclaredInvoice,
	type Invoice,
	type PaymentStatus,
	type Rest
} from '@sattleme/checkout';
import { addMinutes } from 'date-fns';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { lightningLabel } from '$lib/server/sdk/presentations';
import type {
	CheckPaymentResult,
	CreatePaymentParams,
	PaymentTransaction
} from '$lib/server/sdk/pp';
import type { Order } from '$lib/types/Order';

/**
 * What the two sattle.me processors share: the Lightning one (`sattleme`) and the on-chain one
 * (`sattleme-onchain`) make the same kind of invoice, check it the same way, and differ only in
 * what they require of it and what they show as its address.
 *
 * sattle.me runs no server: `@sattleme/checkout` talks to the merchant's Lightning address, the
 * merchant's Nostr relays and a block explorer, with the integration key stored in the shop's
 * settings. Payments go straight to the merchant's wallet.
 */

/** be-BOP stores what `createPayment` returns as `meta` with the payment, without typing it. */
type Payment = Order['payments'][number] & { meta?: unknown };

type PaidStatus = Extract<PaymentStatus, { state: 'paid' }>;

/** What a sattle.me payment keeps in `payment.meta`, server side only. */
export interface SattlemeMeta {
	/** The invoice, as `createInvoice` gave it (or the registry's copy): what each check reads. */
	invoice: Invoice | DeclaredInvoice;
	/** The rest of an on-chain underpayment, while it may be paid. */
	rest?: Rest;
	/** The paid status: the preimage(s) or the txids, the proof of the payment. */
	paid?: PaidStatus;
}

/** Below this, an invoice has no deposit address: Lightning only. */
export const ONCHAIN_MIN_SATS = 1_000;

/** `getStatus` may still report a payment this long after the invoice's end. */
const LATE_REPORT_MS = 120_000;

/** Several relays and the Lightning address answer a creation, each within 10 s. */
const CREATE_TIMEOUT_MS = 30_000;
const CHECK_TIMEOUT_MS = 20_000;
const TEST_TIMEOUT_MS = 12_000;

/**
 * The poller comes back every 2 s, and a check with a deposit address opens a connection to each
 * of the merchant's relays: checks are spaced out per payment instead, more widely once the
 * transaction waits for blocks, which come every ten minutes.
 */
const OPEN_CHECK_INTERVAL_MS = 3_000;
const CONFIRMING_CHECK_INTERVAL_MS = 30_000;
const FAILED_CHECK_INTERVAL_MS = 10_000;

/**
 * While sattle.me's services do not answer, the payment stays pending rather than expiring for
 * want of an answer: up to this long after its end, longer when its funds were already seen.
 */
const OUTAGE_GRACE_MS = 60 * 60_000;
const OUTAGE_GRACE_CONFIRMING_MS = 24 * 60 * 60_000;

// --- Client ---

let cached: { key: string; client: Sattleme } | undefined;

/** One client per integration key: "one invoice at a time" holds within one client. */
function client(): Sattleme {
	const key = runtimeConfig.sattleme.integrationKey;
	if (!key) {
		throw new Error('sattle.me is not configured');
	}
	if (cached?.key !== key) {
		cached = {
			key,
			// The package never gives its logger a secret.
			client: new Sattleme({
				key,
				logger: { warn: (message) => console.warn(`[sattleme] ${message}`) }
			})
		};
	}

	return cached.client;
}

export const isSattlemeConfigured = (): boolean => !!runtimeConfig.sattleme.integrationKey;

/** Matches the package's limit: an invoice can be paid for an hour at most. */
export const sattlemeExpiresIn = (timeoutMinutes: number): Date =>
	addMinutes(new Date(), Math.min(Math.max(timeoutMinutes, 1), 60));

// --- Creating ---

/** One be-BOP payment, one sattle.me sale: never reused, never taken from what the buyer sends. */
export function sattlemeRef(params: Pick<CreatePaymentParams, 'orderNumber' | 'paymentId'>) {
	return `order-${params.orderNumber}-${params.paymentId}`;
}

/** What the merchant's app shows for the sale: the shop's Lightning description, when it has one. */
function noteOf(params: CreatePaymentParams): string | undefined {
	const label = lightningLabel(params.orderId, params.orderNumber)
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u001f\u007f]/g, ' ')
		.trim();
	const note = [...label].slice(0, 100).join('').trim();

	return note || undefined;
}

function durationOf(expiresAt: Date | undefined): number {
	if (!expiresAt) {
		return 900;
	}

	return Math.min(Math.max(Math.round((expiresAt.getTime() - Date.now()) / 1000), 60), 3600);
}

/** Whole sats, rounded up so that the merchant never receives less than the price. */
export function satsOf(params: Pick<CreatePaymentParams, 'toPay'>): number {
	if (params.toPay.currency !== 'SAT') {
		throw new Error(`sattle.me payments are asked in SAT, not ${params.toPay.currency}`);
	}

	return Math.max(Math.ceil(params.toPay.amount), 1);
}

/**
 * The invoice of a payment: a Lightning invoice, a deposit address of the merchant's wallet from
 * 1 000 sats when the integration's lot has one, usually both, declared in the merchant's
 * registry. Only then may it be shown.
 */
export async function createSattlemeInvoice(
	params: CreatePaymentParams
): Promise<Invoice | DeclaredInvoice> {
	try {
		return await client().createInvoice(
			{
				ref: sattlemeRef(params),
				sats: satsOf(params),
				durationSeconds: durationOf(params.expiresAt),
				note: noteOf(params)
			},
			{ signal: AbortSignal.timeout(CREATE_TIMEOUT_MS) }
		);
	} catch (err) {
		// An earlier attempt for this very payment made one (a crash, a timeout after it was
		// declared): that one is the payment's, as the registry holds it.
		if (err instanceof InvoicePendingError) {
			return err.invoice;
		}
		throw err;
	}
}

// --- Showing ---

function isMeta(value: unknown): value is SattlemeMeta {
	if (typeof value !== 'object' || value === null) {
		return false;
	}
	const invoice = (value as { invoice?: unknown }).invoice;

	return (
		typeof invoice === 'object' &&
		invoice !== null &&
		typeof (invoice as Invoice).sats === 'string' &&
		typeof (invoice as Invoice).expiresAt === 'number' &&
		typeof (invoice as Invoice).paymentUri === 'string'
	);
}

export function sattlemeMetaOf(payment: Payment): SattlemeMeta {
	if (!isMeta(payment.meta)) {
		throw new Error(`Payment ${payment._id} has no sattle.me invoice`);
	}

	return payment.meta;
}

/**
 * The rest of an on-chain underpayment the payment waits for, if any. The invoice's own
 * `paymentUri` is never shown: it puts both ways to pay in one QR code, and each method shows
 * only its own.
 */
export function sattlemeRestOf(payment: Payment): Rest | undefined {
	return isMeta(payment.meta) ? payment.meta.rest : undefined;
}

// --- Checking ---

type CheckEntry = {
	nextAt: number;
	/** The last pending result, given again until the next check is due. */
	result?: CheckPaymentResult;
	/** The last check failed for good: thrown again until the next check is due. */
	error?: unknown;
	/** sattle.me's services did not answer the last check (logged once per outage). */
	outage?: true;
	touchedAt: number;
};

const checks = new Map<string, CheckEntry>();

/** Payments that stopped being polled (settled by hand, order cancelled) leave their entry. */
function pruneChecks(now: number) {
	for (const [id, entry] of checks) {
		if (now - entry.touchedAt > 60 * 60_000) {
			checks.delete(id);
		}
	}
}

/** For tests: forget when each payment was last checked. */
export function resetSattlemeChecks() {
	checks.clear();
	cached = undefined;
}

const sat = (amount: string) => ({ amount: Number(amount), currency: 'SAT' as const });

/**
 * The movements of a paid invoice: its payment hash and preimage in Lightning, its transactions
 * on-chain (and the preimages of the rest's invoices). sattle.me says what the payment received in
 * total, not per movement: a lone movement carries the total, several carry 0 each, the total being
 * the payment's `received`.
 */
function transactionsOf(
	status: PaidStatus,
	invoice: SattlemeMeta['invoice']
): PaymentTransaction[] {
	const movements: Array<{ id: string; reference: string }> =
		status.method === 'lightning'
			? [{ id: invoice.paymentHash ?? invoice.ref, reference: status.preimage }]
			: [
					...status.txids.map((txid) => ({ id: txid, reference: txid })),
					...(status.method === 'mixed'
						? status.preimages.map((preimage) => ({ id: preimage, reference: preimage }))
						: [])
			  ];
	const total = status.method === 'lightning' ? Number(invoice.sats) : Number(status.received);

	return movements.map((movement) => ({
		...movement,
		amount: movements.length === 1 ? total : 0,
		currency: 'SAT' as const
	}));
}

async function saveMeta(order: Order, payment: Payment, meta: SattlemeMeta, address?: string) {
	await collections.orders.updateOne(
		{ _id: order._id, 'payments._id': payment._id },
		{ $set: { 'payments.$.meta': meta, ...(address && { 'payments.$.address': address }) } }
	);
	payment.meta = meta;
	if (address) {
		payment.address = address;
	}
}

async function resultOf(
	status: PaymentStatus,
	order: Order,
	payment: Payment,
	meta: SattlemeMeta,
	addressOfRest: (rest: Rest) => string | null
): Promise<CheckPaymentResult> {
	switch (status.state) {
		case 'open': {
			// Underpaid on-chain: the rest may be paid in Lightning, or on-chain to the same address.
			const rest = status.rest;
			if (rest && (rest.sats !== meta.rest?.sats || rest.bolt11 !== meta.rest?.bolt11)) {
				await saveMeta(order, payment, { ...meta, rest }, addressOfRest(rest) ?? undefined);
			}
			return { status: 'pending' };
		}
		case 'unconfirmed':
			return {
				status: 'pending',
				provisional: { received: sat(status.received), reason: 'confirming' },
				transactions: status.txids.map((txid) => ({
					id: txid,
					reference: txid,
					amount: status.txids.length === 1 ? Number(status.received) : 0,
					currency: 'SAT' as const
				}))
			};
		case 'paid':
			// Kept before the order is marked paid: the proof is what answers a customer or an audit.
			await saveMeta(order, payment, { ...meta, paid: status });
			return {
				status: 'paid',
				// Below the amount when the merchant's tolerance or acceptance took it as paid in full.
				received: status.method === 'lightning' ? sat(meta.invoice.sats) : sat(status.received),
				transactions: transactionsOf(status, meta.invoice)
			};
		case 'expired':
			if (Number(status.received) > 0) {
				// The merchant has these sats: the shop settles them with the customer by hand.
				await collections.orders.updateOne(
					{ _id: order._id },
					{
						$push: {
							notes: {
								content: `sattle.me: ${status.received} sats were received on-chain for payment ${payment._id}, less than the ${meta.invoice.sats} sats asked, before it expired. They reached the merchant's wallet: settle them with the customer.`,
								createdAt: new Date(),
								role: null
							}
						}
					}
				);
			}
			return { status: 'expired' };
		default:
			return status satisfies never;
	}
}

/**
 * Where the payment is, from sattle.me. `addressOfRest` gives the address to show once an
 * on-chain underpayment asks for its rest (null: keep the payment's).
 */
export async function checkSattlemePayment(
	order: Order,
	payment: Payment,
	addressOfRest: (rest: Rest) => string | null
): Promise<CheckPaymentResult> {
	const meta = sattlemeMetaOf(payment);
	const id = payment._id.toString();
	const now = Date.now();
	pruneChecks(now);

	const last = checks.get(id);
	if (last && now < last.nextAt) {
		last.touchedAt = now;
		if (last.error !== undefined) {
			throw last.error;
		}
		if (last.result) {
			return last.result;
		}
	}

	try {
		const status = await client().getStatus(meta.invoice, {
			signal: AbortSignal.timeout(CHECK_TIMEOUT_MS)
		});
		const result = await resultOf(status, order, payment, meta, addressOfRest);
		if (result.status === 'pending') {
			checks.set(id, {
				nextAt:
					now +
					(status.state === 'unconfirmed' ? CONFIRMING_CHECK_INTERVAL_MS : OPEN_CHECK_INTERVAL_MS),
				result,
				touchedAt: now
			});
		} else {
			checks.delete(id);
		}
		return result;
	} catch (err) {
		const end = meta.invoice.expiresAt * 1000 + LATE_REPORT_MS;
		const grace = payment.awaitingConfirmation ? OUTAGE_GRACE_CONFIRMING_MS : OUTAGE_GRACE_MS;

		if (err instanceof SattlemeError && err.retryable && now < end + grace) {
			if (!last?.outage) {
				console.warn(
					`[sattleme] payment ${id} of order ${order._id} cannot be checked now (${err.code}): it stays pending until sattle.me's services answer`
				);
			}
			// What was last known holds, the funds already seen included.
			const held: CheckPaymentResult =
				last?.result ??
				(payment.awaitingConfirmation
					? {
							status: 'pending',
							provisional: { received: payment.price, reason: 'confirming' }
					  }
					: { status: 'pending' });
			checks.set(id, {
				nextAt: now + FAILED_CHECK_INTERVAL_MS,
				result: held,
				outage: true,
				touchedAt: now
			});
			return held;
		}

		checks.set(id, { nextAt: now + FAILED_CHECK_INTERVAL_MS, error: err, touchedAt: now });
		throw err;
	}
}

// --- Testing ---

/**
 * be-BOP's "Test connection" button calls `createPayment` for 1 EUR with these ids
 * (`$lib/server/sdk/test-connection`). Real orders have UUIDs.
 */
const CONNECTION_TEST_PREFIX = 'be-bop-connection-test-';

export function isConnectionTest(params: Pick<CreatePaymentParams, 'orderId'>): boolean {
	return params.orderId.startsWith(CONNECTION_TEST_PREFIX);
}

/**
 * Reads the merchant through the integration, without declaring any sale: a real invoice would
 * be declared in the merchant's books and lease a deposit address on every click. be-BOP shows
 * the shop a generic reason when it throws, and logs the message.
 */
export async function testSattlemeConnection(): Promise<void> {
	let onchainAddresses: number;
	try {
		({ onchainAddresses } = await client().merchant({
			signal: AbortSignal.timeout(TEST_TIMEOUT_MS)
		}));
	} catch (err) {
		if (err instanceof SattlemeError) {
			switch (err.code) {
				case 'invalid_key':
					throw new Error(
						'This is not a sattle.me integration key: copy it again from "Integrations" in the sattle.me app.'
					);
				case 'revoked':
					throw new Error(
						'The merchant removed this integration in the sattle.me app: create another one and save its key here.'
					);
				case 'channel_not_found':
					throw new Error(
						"The merchant's relays hold no channel for this integration: check the key, or update be-BOP if the sattle.me app is newer."
					);
			}
		}
		throw err;
	}

	if (runtimeConfig.sattleme.onchain && onchainAddresses === 0) {
		throw new Error(
			'The integration works in Lightning, but holds no deposit address for on-chain payments yet: open the sattle.me app, which fills its lot.'
		);
	}
}
