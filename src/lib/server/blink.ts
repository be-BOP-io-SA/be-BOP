import { createHash } from 'crypto';
import { z } from 'zod';
import { runtimeConfig } from './runtime-config';

/**
 * Blink Lightning client — receive-only, BTC-only.
 *
 * Supports the three receive modes of the Blink BTCPay plugin, selected from config:
 *   (a) api-key custodial  — `blink.apiKey` set: authenticated GraphQL at api.blink.sv
 *   (b) ln-address custodial — `blink.lnAddress` resolves a Blink-hosted wallet via the
 *       public (no-key) GraphQL `accountDefaultWallet` probe; invoices minted + polled via GraphQL
 *   (c) ln-address non-custodial (Spark) — `blink.lnAddress` that does NOT resolve to a
 *       custodial wallet: LNURL-pay to fetch a bolt11 + LUD-21 verify URL for settlement
 *
 * be-BOP shows Blink's bolt11 directly (no re-served LNURL), so the plugin's LNURL request
 * filter / description-hash mirroring is not needed here. Settlement is driven by be-BOP's
 * existing 2s order poller calling checkPayment(), so no separate poll loop is needed.
 */

// Blink's HTTP API can hang on bad credentials / network blips. Fail fast (mirrors
// swiss-bitcoin-pay.ts) so checkout and the admin "test connection" button don't stall.
const BLINK_HTTP_TIMEOUT_MS = 15_000;

export function isBlinkConfigured(): boolean {
	return !!(runtimeConfig.blink?.apiKey || runtimeConfig.blink?.lnAddress);
}

// --- Mode resolution ---

export type BlinkMode =
	| { mode: 'api-key' }
	| { mode: 'custodial'; walletId: string }
	| { mode: 'spark' };

/**
 * Parse `user@domain` (or bare `user` → `user@blink.sv`) into its parts.
 */
export function parseLnAddress(lnAddress: string): { username: string; domain: string } {
	const trimmed = lnAddress.trim();
	const [username, domain] = trimmed.includes('@') ? trimmed.split('@') : [trimmed, 'blink.sv'];
	if (!username || !domain) {
		throw new Error(`Invalid Blink Lightning address: ${lnAddress}`);
	}
	return { username: username.toLowerCase(), domain: domain.toLowerCase() };
}

/**
 * Derive the GraphQL endpoint for a Blink domain.
 * blink.sv → https://api.blink.sv/graphql ; otherwise https://api.{domain}/graphql
 */
export function graphqlEndpointForDomain(domain: string): string {
	const host = domain.startsWith('api.') ? domain : `api.${domain}`;
	const scheme = domain.startsWith('localhost') ? 'http' : 'https';
	return `${scheme}://${host}/graphql`;
}

// Cache confident custodial/spark verdicts per address so we don't probe every payment.
const accountKindCache = new Map<string, BlinkMode>();

/**
 * Resolve which mode applies given current config. Called at createPayment time.
 * At checkPayment time we instead discriminate from persisted payment fields (see PPBlink).
 */
export async function blinkResolveMode(): Promise<BlinkMode> {
	if (runtimeConfig.blink.apiKey) {
		return { mode: 'api-key' };
	}
	if (!runtimeConfig.blink.lnAddress) {
		throw new Error('Blink is not configured');
	}

	const { username, domain } = parseLnAddress(runtimeConfig.blink.lnAddress);
	const cacheKey = `${domain}|${username}`;
	const cached = accountKindCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	// Public no-API-key probe: does this username resolve to a custodial Blink wallet?
	const query = `query AccountDefaultWallet($username: Username!, $walletCurrency: WalletCurrency) {
		accountDefaultWallet(username: $username, walletCurrency: $walletCurrency) { id walletCurrency }
	}`;
	try {
		const data = await blinkGraphql<{
			accountDefaultWallet?: { id?: string; walletCurrency?: string } | null;
		}>(graphqlEndpointForDomain(domain), query, { username, walletCurrency: 'BTC' });
		const walletId = data?.accountDefaultWallet?.id;
		if (walletId) {
			const verdict: BlinkMode = { mode: 'custodial', walletId };
			accountKindCache.set(cacheKey, verdict);
			return verdict;
		}
		// Resolved with no wallet id → treat as spark, but don't cache (ambiguous).
		return { mode: 'spark' };
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		if (/does not exist/i.test(message)) {
			// Confident: not a Blink custodial account → non-custodial Spark.
			const verdict: BlinkMode = { mode: 'spark' };
			accountKindCache.set(cacheKey, verdict);
			return verdict;
		}
		// Ambiguous (rate-limit, transient) → do NOT fall back to Spark: a temporary GraphQL
		// outage must not silently route a custodial merchant down the wrong poller. Fail the
		// payment creation loudly so the merchant sees the connectivity problem.
		throw new Error(`Could not resolve Blink account type: ${message}`);
	}
}

// --- GraphQL transport ---

async function blinkGraphql<T>(
	endpoint: string,
	query: string,
	variables: Record<string, unknown>,
	apiKey?: string
): Promise<T> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		'user-agent': 'be-BOP'
	};
	if (apiKey) {
		headers['X-API-KEY'] = apiKey;
	}

	const response = await fetch(endpoint, {
		method: 'POST',
		headers,
		body: JSON.stringify({ query, variables }),
		signal: AbortSignal.timeout(BLINK_HTTP_TIMEOUT_MS)
	});

	if (!response.ok) {
		throw new Error(`Blink GraphQL request failed: ${response.status} ${response.statusText}`);
	}

	const json = z
		.object({
			data: z.unknown().nullable().optional(),
			errors: z.array(z.object({ message: z.string() })).optional()
		})
		.parse(await response.json());

	if (json.errors?.length) {
		throw new Error(json.errors[0].message);
	}
	if (json.data === null || json.data === undefined) {
		throw new Error('Blink GraphQL response contained no data');
	}
	return json.data as T;
}

const invoiceCreateResult = z.object({
	invoice: z.object({ paymentHash: z.string(), paymentRequest: z.string() }).nullable().optional(),
	errors: z.array(z.object({ message: z.string() })).optional()
});

/**
 * Mint a BTC lightning invoice for a given wallet via `lnInvoiceCreateOnBehalfOfRecipient`.
 * Used by both api-key (authenticated) and custodial-ln-address (public) modes.
 * Returns { paymentRequest (bolt11), paymentHash }.
 */
async function blinkCreateInvoiceOnBehalf(params: {
	endpoint: string;
	walletId: string;
	amountSat: number;
	memo: string;
	expiresInMinutes: number;
	apiKey?: string;
}): Promise<{ paymentRequest: string; paymentHash: string }> {
	const mutation = `mutation CreateInvoice($input: LnInvoiceCreateOnBehalfOfRecipientInput!) {
		lnInvoiceCreateOnBehalfOfRecipient(input: $input) {
			invoice { paymentHash paymentRequest }
			errors { message }
		}
	}`;
	const data = await blinkGraphql<{
		lnInvoiceCreateOnBehalfOfRecipient: z.infer<typeof invoiceCreateResult>;
	}>(
		params.endpoint,
		mutation,
		{
			input: {
				recipientWalletId: params.walletId,
				amount: params.amountSat,
				memo: params.memo,
				expiresIn: params.expiresInMinutes
			}
		},
		params.apiKey
	);
	const payload = invoiceCreateResult.parse(data.lnInvoiceCreateOnBehalfOfRecipient);
	if (!payload.invoice) {
		throw new Error(payload.errors?.[0]?.message ?? 'Blink returned no invoice');
	}
	return payload.invoice;
}

/**
 * Resolve the Blink wallet to use for API-key mode. Uses the configured `walletId` when set,
 * otherwise the account default wallet. Either way the wallet's currency is verified and
 * non-BTC wallets are rejected (be-BOP Blink support is BTC-only).
 */
async function blinkResolveApiKeyWallet(): Promise<string> {
	if (runtimeConfig.blink.walletId) {
		// A configured wallet id must still be a BTC wallet — verify rather than trust.
		const query = `query WalletCurrency($walletId: WalletId!) {
			me { defaultAccount { walletById(walletId: $walletId) { id walletCurrency } } }
		}`;
		const data = await blinkGraphql<{
			me?: { defaultAccount?: { walletById?: { id?: string; walletCurrency?: string } } };
		}>(
			'https://api.blink.sv/graphql',
			query,
			{ walletId: runtimeConfig.blink.walletId },
			runtimeConfig.blink.apiKey
		);
		const wallet = data?.me?.defaultAccount?.walletById;
		if (!wallet?.id) {
			throw new Error('Configured Blink wallet id could not be found on the account');
		}
		assertBtcWallet(wallet.walletCurrency);
		return wallet.id;
	}

	const query = `query GetDefaultWallet {
		me { defaultAccount { defaultWallet { id walletCurrency } } }
	}`;
	const data = await blinkGraphql<{
		me?: { defaultAccount?: { defaultWallet?: { id?: string; walletCurrency?: string } } };
	}>('https://api.blink.sv/graphql', query, {}, runtimeConfig.blink.apiKey);
	const wallet = data?.me?.defaultAccount?.defaultWallet;
	if (!wallet?.id) {
		throw new Error('Could not resolve a default Blink wallet');
	}
	assertBtcWallet(wallet.walletCurrency);
	return wallet.id;
}

function assertBtcWallet(walletCurrency: string | undefined): void {
	if (walletCurrency && walletCurrency !== 'BTC') {
		throw new Error(
			`Blink wallet is ${walletCurrency}; be-BOP supports BTC wallets only. ` +
				`Set a BTC wallet id in the Blink admin settings.`
		);
	}
}

// --- Public create/check API used by the SDK adapter ---

export interface BlinkCreatedInvoice {
	/** bolt11 payment request — goes into OrderPayment.address */
	paymentRequest: string;
	/** payment hash — goes into OrderPayment.invoiceId */
	paymentHash: string;
	/** Spark LUD-21 verify URL — goes into OrderPayment.checkoutId (mode 'spark' only) */
	verifyUrl?: string;
}

/**
 * Create a Blink invoice for `amountSat`, dispatching on the resolved mode.
 */
export async function blinkCreateInvoice(params: {
	amountSat: number;
	memo: string;
	expiresInMinutes: number;
}): Promise<BlinkCreatedInvoice> {
	const resolved = await blinkResolveMode();

	if (resolved.mode === 'api-key') {
		const walletId = await blinkResolveApiKeyWallet();
		return await blinkCreateInvoiceOnBehalf({
			endpoint: 'https://api.blink.sv/graphql',
			walletId,
			amountSat: params.amountSat,
			memo: params.memo,
			expiresInMinutes: params.expiresInMinutes,
			apiKey: runtimeConfig.blink.apiKey
		});
	}

	const { username, domain } = parseLnAddress(runtimeConfig.blink.lnAddress);

	if (resolved.mode === 'custodial') {
		return await blinkCreateInvoiceOnBehalf({
			endpoint: graphqlEndpointForDomain(domain),
			walletId: resolved.walletId,
			amountSat: params.amountSat,
			memo: params.memo,
			expiresInMinutes: params.expiresInMinutes
		});
	}

	// mode 'spark' — LNURL-pay + LUD-21 verify
	return await sparkCreateInvoice({ username, domain, amountSat: params.amountSat });
}

/**
 * Non-custodial Spark receive: resolve the LNURL-pay endpoint, request an invoice for the
 * exact amount, and capture the LUD-21 verify URL for settlement polling.
 */
async function sparkCreateInvoice(params: {
	username: string;
	domain: string;
	amountSat: number;
}): Promise<BlinkCreatedInvoice> {
	const scheme = params.domain.startsWith('localhost') ? 'http' : 'https';
	const metadataUrl = `${scheme}://${params.domain}/.well-known/lnurlp/${encodeURIComponent(
		params.username
	)}`;

	const metaResp = await fetch(metadataUrl, {
		headers: { 'user-agent': 'be-BOP' },
		signal: AbortSignal.timeout(BLINK_HTTP_TIMEOUT_MS)
	});
	if (!metaResp.ok) {
		throw new Error(`LNURL-pay endpoint unavailable: ${metaResp.status} ${metaResp.statusText}`);
	}
	const meta = z
		.object({
			tag: z.string().optional(),
			callback: z.string().optional(),
			minSendable: z.number().optional(),
			maxSendable: z.number().optional(),
			status: z.string().optional(),
			reason: z.string().optional()
		})
		.parse(await metaResp.json());

	if (meta.status === 'ERROR') {
		throw new Error(meta.reason ?? 'LNURL-pay endpoint returned an error');
	}
	if (meta.tag !== 'payRequest' || !meta.callback) {
		throw new Error('Not a valid LNURL-pay endpoint');
	}

	const amountMsat = params.amountSat * 1000;
	if (meta.minSendable !== undefined && amountMsat < meta.minSendable) {
		throw new Error(`Amount below Lightning address minimum (${meta.minSendable} msat)`);
	}
	if (meta.maxSendable !== undefined && amountMsat > meta.maxSendable) {
		throw new Error(`Amount above Lightning address maximum (${meta.maxSendable} msat)`);
	}

	const callbackUrl = new URL(meta.callback);
	callbackUrl.searchParams.set('amount', String(amountMsat));

	const cbResp = await fetch(callbackUrl, {
		headers: { 'user-agent': 'be-BOP' },
		signal: AbortSignal.timeout(BLINK_HTTP_TIMEOUT_MS)
	});
	if (!cbResp.ok) {
		throw new Error(`LNURL-pay callback failed: ${cbResp.status} ${cbResp.statusText}`);
	}
	const cb = z
		.object({
			pr: z.string().optional(),
			verify: z.string().optional(),
			status: z.string().optional(),
			reason: z.string().optional()
		})
		.parse(await cbResp.json());

	if (cb.status === 'ERROR') {
		throw new Error(cb.reason ?? 'LNURL-pay callback returned an error');
	}
	if (!cb.pr) {
		throw new Error('LNURL-pay callback did not return an invoice');
	}

	// The verify URL host serves LUD-21; derive the payment hash from it when present so we
	// don't need a bolt11 decoder (matches the plugin's "verify key is authoritative" stance).
	if (!cb.verify) {
		throw new Error('LNURL-pay callback did not return a LUD-21 verify URL');
	}
	const paymentHash = extractPaymentHashFromVerifyUrl(cb.verify);
	if (!paymentHash) {
		throw new Error(`LUD-21 verify URL does not contain a valid payment hash: ${cb.verify}`);
	}

	return { paymentRequest: cb.pr, paymentHash, verifyUrl: cb.verify };
}

/**
 * Extract the payment hash from a LUD-21 verify URL (`{origin}/verify/{paymentHash}`).
 * Parses the URL properly (tolerating trailing slashes) and requires a 64-char hex hash.
 * Returns null when no valid hash is present.
 */
export function extractPaymentHashFromVerifyUrl(verifyUrl: string): string | null {
	let pathname: string;
	try {
		pathname = new URL(verifyUrl).pathname;
	} catch {
		return null;
	}
	const lastSegment = pathname.split('/').filter(Boolean).pop();
	return lastSegment && /^[0-9a-f]{64}$/i.test(lastSegment) ? lastSegment.toLowerCase() : null;
}

// --- Status checking ---

export type BlinkInvoiceStatus = 'paid' | 'pending' | 'expired';

export function mapGraphqlInvoiceStatus(status: string | null | undefined): BlinkInvoiceStatus {
	switch (status) {
		case 'PAID':
			return 'paid';
		case 'EXPIRED':
			return 'expired';
		default:
			return 'pending';
	}
}

/**
 * Check an API-key-mode invoice via `invoiceByPaymentHash` under the wallet.
 */
async function blinkCheckApiKeyInvoice(paymentHash: string): Promise<BlinkInvoiceStatus> {
	const walletId = await blinkResolveApiKeyWallet();
	const query = `query InvoiceByPaymentHash($paymentHash: PaymentHash!, $walletId: WalletId!) {
		me { defaultAccount { walletById(walletId: $walletId) {
			invoiceByPaymentHash(paymentHash: $paymentHash) { paymentStatus }
		} } }
	}`;
	const data = await blinkGraphql<{
		me?: {
			defaultAccount?: {
				walletById?: { invoiceByPaymentHash?: { paymentStatus?: string } };
			};
		};
	}>('https://api.blink.sv/graphql', query, { paymentHash, walletId }, runtimeConfig.blink.apiKey);
	return mapGraphqlInvoiceStatus(
		data?.me?.defaultAccount?.walletById?.invoiceByPaymentHash?.paymentStatus
	);
}

/**
 * Check a custodial-ln-address invoice via the public `lnInvoicePaymentStatusByHash` query.
 * Ledger-aware: reports PAID even for intraledger (Blink-app) payments that LUD-21 would miss.
 */
async function blinkCheckCustodialInvoice(paymentHash: string): Promise<BlinkInvoiceStatus> {
	const { domain } = parseLnAddress(runtimeConfig.blink.lnAddress);
	const query = `query PaymentStatus($input: LnInvoicePaymentStatusByHashInput!) {
		lnInvoicePaymentStatusByHash(input: $input) { status }
	}`;
	const data = await blinkGraphql<{
		lnInvoicePaymentStatusByHash?: { status?: string };
	}>(graphqlEndpointForDomain(domain), query, { input: { paymentHash } });
	return mapGraphqlInvoiceStatus(data?.lnInvoicePaymentStatusByHash?.status);
}

/**
 * Check a Spark invoice via its LUD-21 verify URL. Paid only when `settled === true` AND a
 * preimage is present whose SHA256 equals the payment hash (fail-closed on preimage).
 */
async function blinkCheckSparkInvoice(
	verifyUrl: string,
	paymentHash: string
): Promise<BlinkInvoiceStatus | 'failed'> {
	const resp = await fetch(verifyUrl, {
		headers: { 'user-agent': 'be-BOP' },
		signal: AbortSignal.timeout(BLINK_HTTP_TIMEOUT_MS)
	});
	if (!resp.ok) {
		// Transient — let the poller retry.
		return 'pending';
	}
	const json = z
		.object({
			status: z.string().optional(),
			settled: z.boolean().optional(),
			preimage: z.string().nullable().optional()
		})
		.parse(await resp.json());

	if (json.status === 'ERROR') {
		return 'failed';
	}
	if (json.settled) {
		// Fail-closed: only mark paid when a preimage is present AND hashes to the payment hash.
		// A `settled:true` without a matching preimage must never complete the order.
		if (!json.preimage) {
			console.warn(`Blink Spark invoice ${paymentHash} reported settled but returned no preimage`);
			return 'pending';
		}
		if (!validatePreimage(json.preimage, paymentHash)) {
			console.warn(
				`Blink Spark invoice ${paymentHash} reported settled but preimage did not match payment hash`
			);
			return 'pending';
		}
		return 'paid';
	}
	return 'pending';
}

export function validatePreimage(preimage: string, paymentHash: string): boolean {
	if (!/^[0-9a-fA-F]{64}$/.test(preimage)) {
		return false;
	}
	const computed = createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
	return computed.toLowerCase() === paymentHash.trim().toLowerCase();
}

/**
 * Look up an invoice's status, dispatching on the persisted payment fields.
 *
 * @param paymentHash  OrderPayment.invoiceId
 * @param verifyUrl    OrderPayment.checkoutId (present ⇒ Spark mode)
 */
export async function blinkLookupInvoice(
	paymentHash: string,
	verifyUrl?: string
): Promise<BlinkInvoiceStatus | 'failed'> {
	if (verifyUrl) {
		return await blinkCheckSparkInvoice(verifyUrl, paymentHash);
	}
	if (runtimeConfig.blink.apiKey) {
		return await blinkCheckApiKeyInvoice(paymentHash);
	}
	if (runtimeConfig.blink.lnAddress) {
		return await blinkCheckCustodialInvoice(paymentHash);
	}
	throw new Error('Blink is not configured');
}
