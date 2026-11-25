import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { z } from 'zod';
import { isPrivateIp } from './webhook-url-guard';

/**
 * A Bolt Card holds no funds: tapped, it gives a signed `lnurlw://` link to the account of its
 * holder at the card's provider. The shop takes the payment by following that LNURL-withdraw
 * (LUD-03): it hands the provider the Lightning invoice of the sale, and the provider pays it.
 * be-BOP then sees the invoice paid as for any Lightning payment.
 */

/** A refusal to show the operator: the provider's own reason, or why the card was not used. */
export class BoltCardError extends Error {}

const TIMEOUT_MS = 15_000;

const withdrawRequest = z.object({
	tag: z.literal('withdrawRequest'),
	callback: z.string(),
	k1: z.string(),
	minWithdrawable: z.number(),
	maxWithdrawable: z.number()
});

const serviceError = z.object({ status: z.literal('ERROR'), reason: z.string().optional() });

/** The https address of a card's link; `lnurlw://` is LUD-17's name for it. */
export function boltCardUrl(link: string): URL {
	let url: URL;
	try {
		url = new URL(link.trim().replace(/^lnurlw:\/\//i, 'https://'));
	} catch {
		throw new BoltCardError('This card does not hold a Lightning payment link.');
	}
	if (url.protocol !== 'https:') {
		throw new BoltCardError('This card does not hold a Lightning payment link.');
	}
	return url;
}

/** The address comes from the card, so a stranger chooses it: the shop's network stays out of reach. */
async function assertPublicHost(url: URL) {
	const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
	const addresses =
		host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')
			? ['127.0.0.1']
			: isIP(host)
			? [host]
			: await lookup(host, { all: true }).then(
					(resolved) => resolved.map(({ address }) => address),
					() => {
						throw new BoltCardError(`The card's provider ${host} does not answer.`);
					}
			  );
	if (addresses.some(isPrivateIp)) {
		throw new BoltCardError(`The card's provider ${host} is not on the internet.`);
	}
}

async function getJson(url: URL): Promise<unknown> {
	await assertPublicHost(url);
	let response: Response;
	try {
		response = await fetch(url, {
			headers: { accept: 'application/json' },
			redirect: 'error',
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch {
		throw new BoltCardError(`The card's provider ${url.hostname} does not answer.`);
	}
	const body = await response.json().catch(() => undefined);
	const refusal = serviceError.safeParse(body);
	if (refusal.success) {
		throw new BoltCardError(refusal.data.reason || `${url.hostname} refused the card.`);
	}
	if (!response.ok) {
		throw new BoltCardError(`${url.hostname} answered ${response.status}.`);
	}
	return body;
}

/**
 * Hands `invoice` to the provider of the card that gave `link`. Resolves once the provider has
 * accepted it; the payment itself arrives on the invoice a moment later.
 */
export async function payInvoiceWithBoltCard(params: {
	link: string;
	invoice: string;
	amountSat: number;
}): Promise<void> {
	const request = withdrawRequest.safeParse(await getJson(boltCardUrl(params.link)));
	if (!request.success) {
		throw new BoltCardError('This card does not hold a Lightning payment link.');
	}
	const { callback, k1, minWithdrawable, maxWithdrawable } = request.data;
	const amountMsat = params.amountSat * 1000;
	if (amountMsat > maxWithdrawable) {
		throw new BoltCardError(
			`The card allows ${Math.floor(maxWithdrawable / 1000)} sats at most for this payment.`
		);
	}
	if (amountMsat < minWithdrawable) {
		throw new BoltCardError(
			`The card asks for ${Math.ceil(minWithdrawable / 1000)} sats at least for a payment.`
		);
	}
	let callbackUrl: URL;
	try {
		callbackUrl = new URL(callback);
	} catch {
		throw new BoltCardError(`The card's provider gave an invalid address.`);
	}
	if (callbackUrl.protocol !== 'https:') {
		throw new BoltCardError(`The card's provider gave an invalid address.`);
	}
	callbackUrl.searchParams.set('k1', k1);
	callbackUrl.searchParams.set('pr', params.invoice);
	const answer = z.object({ status: z.literal('OK') }).safeParse(await getJson(callbackUrl));
	if (!answer.success) {
		throw new BoltCardError(`${callbackUrl.hostname} did not accept the payment.`);
	}
}
