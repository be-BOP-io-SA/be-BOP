import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { isPhoenixdConfigured } from '$lib/server/phoenixd';
import type { LnurlWithdraw } from '$lib/types/LnurlWithdraw';
import type { Currency } from '$lib/types/Currency';
import { toSatoshis } from '$lib/utils/toSatoshis';
import type { ObjectId } from 'mongodb';
import { ORIGIN } from '$lib/server/env-config';
import { bech32 } from 'bech32';
import qrcode from 'qrcode';
import crypto from 'crypto';

/**
 * Why the shop cannot hand out sats right now.
 *
 * The four are checked twice — when the withdraw is created, and again when someone comes to
 * collect — because a node that was ready a minute ago may not be: a channel closes, the balance
 * drops with the sale next door, the container loses the network.
 */
export const WITHDRAW_BLOCKERS = [
	'NOT_CONFIGURED',
	'UNREACHABLE',
	'NO_CHANNELS',
	'INSUFFICIENT_LIQUIDITY'
] as const;
export type WithdrawBlocker = (typeof WITHDRAW_BLOCKERS)[number];

export type WithdrawReadiness =
	| { ready: true; balanceSat: number }
	| {
			ready: false;
			blocker: WithdrawBlocker;
			message: string;
			details?: Record<string, number | string>;
	  };

/**
 * phoenixd takes a fee on what it sends, and routing takes more. Checking the balance against the
 * bare amount lets a withdraw at the ceiling be accepted, then fail while paying — after the
 * wallet has shown the customer a success. The margin is deliberately generous: refusing early is
 * cheaper than an invoice the shop cannot honour.
 */
const FEE_MARGIN_RATIO = 0.01;
const FEE_MARGIN_MIN_SAT = 10;

export function withdrawFeeMarginSat(amountSat: number): number {
	return Math.max(FEE_MARGIN_MIN_SAT, Math.ceil(amountSat * FEE_MARGIN_RATIO));
}

const PHOENIXD_TIMEOUT_MS = 5000;

async function phoenixdGet(path: string): Promise<Response> {
	return fetch(`${runtimeConfig.phoenixd.url}${path}`, {
		headers: {
			Authorization: `Basic ${Buffer.from(`:${runtimeConfig.phoenixd.password}`).toString(
				'base64'
			)}`
		},
		signal: AbortSignal.timeout(PHOENIXD_TIMEOUT_MS)
	});
}

/**
 * Can the shop pay `amountSat` right now?
 *
 * Demo scope: phoenixd only. No other Lightning backend is consulted, and none is fallen back to.
 */
export async function checkWithdrawReadiness(amountSat: number): Promise<WithdrawReadiness> {
	if (!isPhoenixdConfigured()) {
		return {
			ready: false,
			blocker: 'NOT_CONFIGURED',
			message: 'Phoenixd is not configured on this shop'
		};
	}

	let channels: unknown[];
	let balanceSat: number;
	try {
		const [channelsRes, balanceRes] = await Promise.all([
			phoenixdGet('/listchannels'),
			phoenixdGet('/getbalance')
		]);
		if (!channelsRes.ok || !balanceRes.ok) {
			return {
				ready: false,
				blocker: 'UNREACHABLE',
				message: 'Phoenixd answered with an error',
				details: { channelsStatus: channelsRes.status, balanceStatus: balanceRes.status }
			};
		}
		channels = await channelsRes.json();
		balanceSat = ((await balanceRes.json()) as { balanceSat: number }).balanceSat;
	} catch (err) {
		return {
			ready: false,
			blocker: 'UNREACHABLE',
			message: 'Phoenixd could not be reached',
			details: { error: err instanceof Error ? err.message : String(err) }
		};
	}

	if (!Array.isArray(channels) || !channels.length) {
		return {
			ready: false,
			blocker: 'NO_CHANNELS',
			message: 'Phoenixd has no open channel to pay from'
		};
	}

	const needed = amountSat + withdrawFeeMarginSat(amountSat);
	if (balanceSat < needed) {
		return {
			ready: false,
			blocker: 'INSUFFICIENT_LIQUIDITY',
			message: 'Not enough liquidity to honour this withdraw',
			details: { balanceSat, requestedSat: amountSat, neededSat: needed }
		};
	}

	return { ready: true, balanceSat };
}

/**
 * Turn an amount named in a currency into the sats the node will hand out.
 *
 * `toCurrency` returns the amount untouched when the shop has no rate for that currency — the
 * right call for a price on a page, the wrong one here: a withdraw of 50 CHF would quietly become
 * a withdraw of 50 sat. A missing rate is therefore a refusal, not a fallback.
 */
export function withdrawAmountToSat(
	amount: number,
	currency: Currency
): { sat: number } | { error: string } {
	if (currency !== 'BTC' && runtimeConfig.exchangeRate[currency] === undefined) {
		return { error: `This shop has no exchange rate for ${currency}` };
	}

	const sat = toSatoshis(amount, currency);

	if (sat < 1) {
		return { error: `${amount} ${currency} is worth less than one satoshi` };
	}

	return { sat };
}

/**
 * A withdraw URL is not handed to a wallet as an address: LUD-01 asks for the URL bech32-encoded
 * under the `lnurl` prefix. The result is uppercased because a QR code stores uppercase
 * alphanumerics in a denser mode than mixed case — same data, fewer modules to print.
 *
 * The 90-character ceiling the library defaults to is the one from BIP-173, which LNURL does not
 * follow: a shop URL with a UUID lands around 110 characters once encoded.
 */
const BECH32_LIMIT = 2000;

export function encodeLnurl(url: string): string {
	return bech32
		.encode('lnurl', bech32.toWords(Buffer.from(url, 'utf8')), BECH32_LIMIT)
		.toUpperCase();
}

/**
 * The three forms of the same withdraw, because wallets disagree on what they accept:
 * the plain URL, the `LNURL1…` address, and the `lnurlw://` scheme (LUD-17).
 */
export function withdrawUrls(id: string): { url: string; lnurl: string; lnurlw: string } {
	const url = `${ORIGIN}/lnurlw/${id}`;
	return {
		url,
		lnurl: encodeLnurl(url),
		lnurlw: url.replace(/^https?:\/\//, 'lnurlw://')
	};
}

/** The same address, ready to print. SVG scales to any printer without turning to mush. */
export async function withdrawQrCodeSvg(id: string): Promise<string> {
	const { lnurl } = withdrawUrls(id);
	return (await qrcode.toString(lnurl, { type: 'svg' })).trim();
}

export async function createLnurlWithdraw(params: {
	minSat: number;
	maxSat: number;
	description: string;
	apiKeyId: ObjectId;
	orderId?: string;
	requestedAmount?: number;
	requestedCurrency?: Currency;
	expiresInSeconds: number;
}): Promise<LnurlWithdraw> {
	const now = new Date();
	const withdraw: LnurlWithdraw = {
		_id: crypto.randomUUID(),
		k1: crypto.randomBytes(32).toString('hex'),
		minSat: params.minSat,
		maxSat: params.maxSat,
		description: params.description,
		status: 'open',
		expiresAt: new Date(now.getTime() + params.expiresInSeconds * 1000),
		apiKeyId: params.apiKeyId,
		...(params.orderId && { orderId: params.orderId }),
		...(params.requestedCurrency && {
			requestedAmount: params.requestedAmount,
			requestedCurrency: params.requestedCurrency
		}),
		createdAt: now,
		updatedAt: now
	};
	await collections.lnurlWithdrawals.insertOne(withdraw);
	return withdraw;
}

/**
 * Claim the withdraw for one payment attempt.
 *
 * Two wallets can call the callback at the same instant, and both would pass a plain status read.
 * The move to `paying` is the reservation: whoever loses the race gets `null` and is told the
 * withdraw is spent, before a single sat leaves.
 */
export async function reserveLnurlWithdraw(id: string, k1: string): Promise<LnurlWithdraw | null> {
	const reserved = await collections.lnurlWithdrawals.findOneAndUpdate(
		{ _id: id, k1, status: 'open', expiresAt: { $gt: new Date() } },
		{ $set: { status: 'paying', updatedAt: new Date() } },
		{ returnDocument: 'after' }
	);
	return reserved.value ?? null;
}

export async function markWithdrawPaid(
	id: string,
	paid: { paidSat: number; feeSat: number; paymentHash: string }
): Promise<void> {
	await collections.lnurlWithdrawals.updateOne(
		{ _id: id },
		{
			$set: {
				status: 'paid',
				paidAt: new Date(),
				updatedAt: new Date(),
				paidSat: paid.paidSat,
				feeSat: paid.feeSat,
				paymentHash: paid.paymentHash
			}
		}
	);
}

/** Back to `open`: the payment failed, so the customer must be able to try again. */
export async function releaseWithdraw(id: string, reason: string): Promise<void> {
	await collections.lnurlWithdrawals.updateOne(
		{ _id: id, status: 'paying' },
		{ $set: { status: 'open', updatedAt: new Date(), failureReason: reason } }
	);
}
