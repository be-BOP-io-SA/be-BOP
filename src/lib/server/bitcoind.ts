import {
	BITCOIN_RPC_URL,
	BITCOIN_RPC_PASSWORD,
	BITCOIN_RPC_USER,
	TOR_PROXY_URL,
	BIP84_XPUB
} from '$lib/server/env-config';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { runtimeConfig } from './runtime-config';
import { socksDispatcher } from 'fetch-socks';
import type { ObjectId } from 'mongodb';

export const isBitcoinConfigured =
	!!BITCOIN_RPC_URL && !!BITCOIN_RPC_PASSWORD && !!BITCOIN_RPC_USER;

export const isBIP84Configured =
	isBitcoinConfigured && (BIP84_XPUB.startsWith('xpub') || BIP84_XPUB.startsWith('tpub'));

const dispatcher =
	isBitcoinConfigured &&
	TOR_PROXY_URL &&
	new URL(TOR_PROXY_URL).protocol === 'socks5:' &&
	new URL(BITCOIN_RPC_URL).hostname.endsWith('.onion')
		? socksDispatcher({
				type: 5,
				host: new URL(TOR_PROXY_URL).hostname,
				port: parseInt(new URL(TOR_PROXY_URL).port)
		  })
		: undefined;

export type BitcoinCommand =
	| 'listtransactions'
	| 'listwallets'
	| 'loadwallet'
	| 'listwalletdir'
	| 'createwallet'
	| 'listreceivedbyaddress'
	| 'dumpprivkey'
	| 'listdescriptors'
	| 'importdescriptors'
	| 'getdescriptorinfo'
	| 'getnewaddress'
	| 'getbalance'
	| 'getblockchaininfo';

export async function bitcoinRpc(command: BitcoinCommand, params: unknown[], wallet?: string) {
	let url = BITCOIN_RPC_URL;

	if (
		![
			'listwallets',
			'createwallet',
			'getblockhaininfo',
			'setlabel',
			'listwalletdir',
			'loadwallet'
		].includes(command)
	) {
		const wallets = await listWallets();

		if (wallet && !wallets.includes(wallet)) {
			throw error(400, `Wallet ${wallet} does not exist`);
		}

		if (wallets.length > 1) {
			const selectedWallet =
				wallet ||
				(wallets.includes(runtimeConfig.bitcoinWallet) ? runtimeConfig.bitcoinWallet : wallets[0]);
			url = `${url.endsWith('/') ? url.slice(0, -1) : url}/wallet/${selectedWallet}`;
		}
	}

	if (!isBitcoinConfigured) {
		throw error(500, 'Bitcoin RPC is not configured');
	}

	const authorization = `Basic ${Buffer.from(
		`${BITCOIN_RPC_USER}:${BITCOIN_RPC_PASSWORD}`
	).toString('base64')}`;

	return fetch(url, {
		method: 'POST',
		headers: {
			'Content-Type': 'text/plain',
			Authorization: authorization
		},
		body: JSON.stringify({
			jsonrpc: '1.0',
			id: crypto.randomUUID(),
			method: command,
			params
		}),
		...{ dispatcher, autoSelectFamily: true }
	});
}

export async function listWallets() {
	const response = await bitcoinRpc('listwallets', []);

	if (!response.ok) {
		console.error(await response.text());
		throw error(500, 'Could not list wallets');
	}

	const json = await response.json();
	return z.object({ result: z.string().array() }).parse(json).result;
}

export async function currentWallet() {
	const wallets = await listWallets();
	return wallets.includes(runtimeConfig.bitcoinWallet) ? runtimeConfig.bitcoinWallet : wallets[0];
}

export async function createWallet(name: string) {
	const disablePrivateKeys = !!isBIP84Configured;
	const response = await bitcoinRpc('createwallet', [
		name,
		disablePrivateKeys,
		false,
		null,
		false,
		true,
		// load wallet on startup
		true
	]);

	if (!response.ok) {
		console.error(await response.text());
		throw error(500, 'Could not create wallet');
	}

	const json = await response.json();
	const walletName = z.object({ result: z.object({ name: z.string() }) }).parse(json).result.name;

	/**
	 * Create new wallet watching the BIP84 addresses
	 */
	if (isBIP84Configured) {
		// todo: use proper fingerprint
		const descriptor = await getDescriptorInfo(`wpkh([00000000/84h/0h/0h]${BIP84_XPUB}/0/*)`);

		const response2 = await bitcoinRpc(
			'importdescriptors',
			[
				[
					{
						desc: descriptor.descriptor,
						timestamp: 'now',
						range: [0, 1000],
						internal: false,
						active: true
					}
				]
			],
			walletName
		);

		if (!response2.ok) {
			console.error('import descriptors', await response2.text());
			throw error(500, 'Could not import descriptors');
		}

		const json2 = await response2.json();

		if (!json2.result[0].success) {
			console.error('import descriptors 2', json2);
			throw error(500, 'Could not import descriptors');
		}
	}

	return walletName;
}

export async function getDescriptorInfo(descriptor: string) {
	const response = await bitcoinRpc('getdescriptorinfo', [descriptor]);

	if (!response.ok) {
		console.error('getDescriptorInfo', await response.text());
		throw error(500, 'Could not get descriptor info');
	}

	const json = await response.json();
	return z
		.object({
			result: z.object({
				descriptor: z.string(),
				isrange: z.boolean(),
				issolvable: z.boolean(),
				hasprivatekeys: z.boolean()
			})
		})
		.parse(json).result;
}

export async function getNewAddress(label: string): Promise<string> {
	const response = await bitcoinRpc('getnewaddress', [label, 'bech32']);

	if (!response.ok) {
		console.error(await response.text());
		throw error(500, 'Could not get new address');
	}

	const json = await response.json();
	return z.object({ result: z.string() }).parse(json).result;
}

export async function listTransactions(label?: string) {
	const response = await bitcoinRpc('listtransactions', [label || '*', 100, 0, true]);

	if (!response.ok) {
		console.error(await response.text());
		throw error(500, 'Could not list transactions');
	}

	const json = await response.json();
	return z
		.object({
			result: z.array(
				z.object({
					address: z.string(),
					category: z.enum(['send', 'receive', 'generate', 'immature', 'orphan']),
					label: z.string().optional(),
					fee: z.number().optional(),
					amount: z.number(),
					confirmations: z.number(),
					txid: z.string()
				})
			)
		})
		.parse(json).result;
}

export async function getBalance(confirmations = 1) {
	const response = await bitcoinRpc('getbalance', ['*', confirmations]);

	if (!response.ok) {
		console.error(await response.text());
		throw error(500, 'Could not get balance');
	}

	const json = await response.json();
	return z.object({ result: z.number() }).parse(json).result;
}

export async function getBlockchainInfo() {
	const response = await bitcoinRpc('getblockchaininfo', []);

	if (!response.ok) {
		console.error(await response.text());
		throw error(500, 'Could not get blockchain info');
	}

	const json = await response.json();
	return z.object({ result: z.object({ blocks: z.number(), chain: z.string() }) }).parse(json)
		.result;
}

export async function listDescriptors(wallet: string) {
	const response = await bitcoinRpc('listdescriptors', [true], wallet);

	if (!response.ok) {
		console.error(await response.text());
		throw error(500, 'Could not list wallet descriptors');
	}

	const json = await response.json();
	return z
		.object({
			result: z.object({
				descriptors: z.array(
					z.object({
						desc: z.string(),
						timestamp: z.number(),
						active: z.boolean(),
						internal: z.boolean(),
						range: z.array(z.number()),
						next: z.number()
					})
				)
			})
		})
		.parse(json).result;
}

export async function dumpWalletInfo(wallet: string): Promise<{
	descriptors?: Array<{ desc: string }>;
	privKeys?: Array<{
		address: string;
		privKey: string;
		balance: number;
	}>;
}> {
	try {
		const descriptors = await listDescriptors(wallet);

		if (descriptors.descriptors.length > 0) {
			return descriptors;
		}
	} catch {}

	const response = await bitcoinRpc('listreceivedbyaddress', [0, false, false, '', true], wallet);

	if (!response.ok) {
		console.error(await response.text());
		throw error(500, 'Could not list wallet addresses');
	}

	const json = await response.json();
	const { result: addresses } = z
		.object({
			result: z.array(z.object({ address: z.string(), amount: z.number() }))
		})
		.parse(json);

	const privKeys = (
		await Promise.all(
			addresses.map(async ({ address, amount }) => {
				const response = await bitcoinRpc('dumpprivkey', [address], wallet);

				if (!response.ok) {
					console.error(await response.text());
					throw error(500, 'Could not dump private key for address: ' + address);
				}

				const privKey = z.object({ result: z.string() }).parse(await response.json()).result;

				return {
					address,
					privKey,
					balance: amount
				};
			})
		)
	).filter((x) => x !== undefined);

	return {
		privKeys
	};
}

export async function listDiskWallets() {
	const response = await bitcoinRpc('listwalletdir', []);

	if (!response.ok) {
		console.error(await response.text());
		throw error(500, 'Could not list disk wallets');
	}

	const json = await response.json();
	return z
		.object({ result: z.object({ wallets: z.array(z.object({ name: z.string() })) }) })
		.parse(json).result.wallets;
}

export async function loadWallet(wallet: string) {
	// true to load on startup / persist wallet
	const response = await bitcoinRpc('loadwallet', [wallet, true]);

	if (!response.ok) {
		console.error(await response.text());
		throw error(500, 'Could not load wallet');
	}

	const json = await response.json();
	return z.object({ result: z.object({ name: z.string(), warning: z.string() }) }).parse(json)
		.result;
}

export async function loadDiskWallets() {
	const wallets = await listDiskWallets();
	const loadedWallets = await listWallets();

	for (const wallet of wallets) {
		if (!loadedWallets.includes(wallet.name)) {
			await loadWallet(wallet.name);
		}
	}
}

export type BitcoinTransaction = Awaited<ReturnType<typeof listTransactions>>[number];

export function orderAddressLabel(orderId: string, paymentId: ObjectId) {
	return `order:${orderId}:${paymentId}`;
}

// export function bip84Address(zpub: string, index: number): string {
// 	return new bip84.fromZPub(zpub).getAddress(index);
// }

// export function bip84PublicKey(zpub: string, index: number): string {
// 	return new bip84.fromZPub(zpub).getPublicKey(index);
// }

// export function isZPubValid(zpub: string): boolean {
// 	try {
// 		new bip84.fromZPub(zpub).getAddress(0);
// 		return true;
// 	} catch {
// 		return false;
// 	}
// }
