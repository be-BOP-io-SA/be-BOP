import { readFileSync } from 'node:fs';
// We use undici instead of native fetch to be able to accept self-signed certificates
import { Agent, fetch } from 'undici';
import { z } from 'zod';
import { error } from '@sveltejs/kit';
import { socksDispatcher } from 'fetch-socks';

import { env } from '$env/dynamic/private';
const LND_MACAROON_PATH = env.LND_MACAROON_PATH;
const LND_MACAROON_VALUE = env.LND_MACAROON_VALUE;
const LND_REST_URL = env.LND_REST_URL;
const TOR_PROXY_URL = env.TOR_PROXY_URL;

if (LND_MACAROON_PATH && LND_MACAROON_VALUE) {
	throw new Error('Cannot specify both LND_MACAROON_PATH and LND_MACAROON_VALUE');
}

export function isLndConfigured() {
	return !!LND_REST_URL;
}

const macaroon = LND_MACAROON_PATH
	? readFileSync(LND_MACAROON_PATH).toString('hex')
	: LND_MACAROON_VALUE;

const dispatcher =
	isLndConfigured() &&
	TOR_PROXY_URL &&
	new URL(TOR_PROXY_URL).protocol === 'socks5:' &&
	new URL(LND_REST_URL).hostname.endsWith('.onion')
		? socksDispatcher(
				{
					type: 5,
					host: new URL(TOR_PROXY_URL).hostname,
					port: parseInt(new URL(TOR_PROXY_URL).port)
				},
				{
					connect: {
						rejectUnauthorized: false
					}
				}
		  )
		: (() => {
				// For https://localhost or https://127.0.0.1, we need to disable TLS verification
				if (!LND_REST_URL) {
					return null;
				}
				const url = new URL(LND_REST_URL);

				if (
					url.protocol === 'https:' &&
					(url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]')
				) {
					return new Agent({
						connect: {
							rejectUnauthorized: false
						}
					});
				}

				return null;
		  })();

export function lndRpc(
	path: string,
	options: { method?: string; headers?: Record<string, string>; body?: string } = {}
) {
	if (!isLndConfigured()) {
		throw error(500, 'LND Rest is not configured');
	}
	return fetch(`${LND_REST_URL}${path}`, {
		headers: {
			...options.headers,
			...(macaroon && { 'Grpc-Metadata-macaroon': macaroon })
		},
		method: options.method || 'GET',
		...(dispatcher && { dispatcher }),
		...(options?.body && { body: options.body }),
		...{ autoSelectFamily: true }
	});
}

export async function lndListChannels() {
	const response = await lndRpc('/v1/channels');

	if (!response.ok) {
		throw error(500, 'Could not list channels');
	}

	const json = await response.json();
	return z
		.object({
			channels: z.array(
				z.object({
					capacity: z.number({ coerce: true }).int(),
					chan_id: z.number({ coerce: true }).int(),
					local_balance: z.number({ coerce: true }).int(),
					remote_balance: z.number({ coerce: true }).int()
				})
			)
		})
		.parse(json).channels;
}

export async function lndWalletBalance() {
	const response = await lndRpc('/v1/balance/blockchain');

	if (!response.ok) {
		throw error(500, 'Could not get lnd wallet balance');
	}

	const json = await response.json();
	return z
		.object({
			total_balance: z.number({ coerce: true }).int(),
			confirmed_balance: z.number({ coerce: true }).int()
		})
		.parse(json).total_balance;
}
export async function lndGetInfo() {
	const response = await lndRpc('/v1/getinfo');

	if (!response.ok) {
		throw error(500, 'Could not get lnd info');
	}

	const json = await response.json();

	return z
		.object({
			alias: z.string(),
			testnet: z.boolean(),
			num_peers: z.number().int(),
			num_pending_channels: z.number().int(),
			num_active_channels: z.number().int(),
			num_inactive_channels: z.number().int(),
			synced_to_chain: z.boolean(),
			synced_to_graph: z.boolean(),
			uris: z.array(z.string())
		})
		.parse(json);
}

export async function lndChannelsBalance() {
	const response = await lndRpc('/v1/balance/channels');

	if (!response.ok) {
		throw error(500, 'Could not get lnd channels balance');
	}

	const json = await response.json();
	return z.object({ balance: z.number({ coerce: true }).int() }).parse(json).balance;
}

export async function lndAutopilotActive() {
	const response = await lndRpc('/v2/autopilot/status');

	if (!response.ok) {
		throw error(500, 'Could not get lnd autopilot status');
	}

	const json = await response.json();
	return z.object({ active: z.boolean() }).parse(json).active;
}

export async function lndActivateAutopilot() {
	const response = await lndRpc('/v2/autopilot/modify', {
		method: 'POST',
		body: JSON.stringify({ enable: true })
	});

	if (!response.ok) {
		throw error(500, 'Could not activate lnd autopilot');
	}
}

/**
 * @param amount Amount in satoshis, or msat if `opts.milliSatoshis` is true
 */
export async function lndCreateInvoice(
	amount: number,
	opts?: {
		expireAfterSeconds?: number;
		label?: string;
		milliSatoshis?: boolean;
		descriptionHash?: ArrayBuffer;
	}
) {
	const response = await lndRpc('/v1/invoices', {
		method: 'POST',
		body: JSON.stringify({
			...(opts?.label && { memo: opts.label }),
			...(opts?.milliSatoshis ? { value_msat: String(amount) } : { value: String(amount) }),
			...(opts?.expireAfterSeconds && { expiry: String(opts.expireAfterSeconds) }),
			...(opts?.descriptionHash && {
				description_hash: Buffer.from(opts.descriptionHash).toString('base64')
			})
		})
	});

	if (!response.ok) {
		throw error(500, 'Could not create invoice');
	}

	const json = await response.json();
	return z
		.object({ payment_request: z.string(), r_hash: z.string(), payment_addr: z.string() })
		.parse(json);
}

export async function lndLookupInvoice(invoiceId: string) {
	const response = await lndRpc(`/v1/invoice/${Buffer.from(invoiceId, 'base64').toString('hex')}`);

	if (!response.ok) {
		throw error(500, 'Could not lookup invoice: ' + invoiceId);
	}

	const json = await response.json();
	const ret = z
		.object({
			amt_paid_sat: z.number({ coerce: true }).int(),
			state: z.enum(['SETTLED', 'CANCELED', 'ACCEPTED', 'OPEN']),
			settled_at: z.number({ coerce: true }).int().optional()
		})
		.parse(json);

	return { ...ret, settled_at: ret.settled_at ? new Date(ret.settled_at * 1000) : undefined };
}

export async function lndListInvoices() {
	const response = await lndRpc('/v1/invoices');

	if (!response.ok) {
		throw error(500, 'Could not list invoices');
	}

	const json = await response.json();
	const ret = z
		.object({
			invoices: z.array(
				z.object({
					r_hash: z.string(),
					amt_paid_sat: z.number({ coerce: true }).int(),
					state: z.enum(['SETTLED', 'CANCELED', 'ACCEPTED', 'OPEN']),
					settled_at: z.number({ coerce: true }).int().optional()
				})
			)
		})
		.parse(json);

	return ret.invoices.map((invoice) => ({
		...invoice,
		settled_at: invoice.settled_at ? new Date(invoice.settled_at * 1000) : undefined
	}));
}
