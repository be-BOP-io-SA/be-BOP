// @ts-expect-error no types
import bip84 from 'bip84';
import bs58check from 'bs58check';
import { ChangeChain, buildBip48P2wshAddress } from 'bip48-multisig';
import { runtimeConfig, runtimeConfigUpdatedAt } from './runtime-config';
import { z } from 'zod';
import { sum } from '$lib/utils/sum';
import { trimSuffix } from '$lib/utils/trimSuffix';
import { persistConfigElement } from './utils/persistConfig';
import { collections } from './database';

// SLIP-132 version bytes. See https://github.com/satoshilabs/slips/blob/master/slip-0132.md
const SLIP132_XPUB = Buffer.from('0488b21e', 'hex');
const SLIP132_TPUB = Buffer.from('043587cf', 'hex');
const SLIP132_ZPUB = Buffer.from('04b24746', 'hex');
const SLIP132_VPUB = Buffer.from('045f1cf6', 'hex');

const MAINNET_XPUB_PREFIXES: readonly string[] = ['xpub', 'ypub', 'zpub', 'Ypub', 'Zpub'];
const TESTNET_XPUB_PREFIXES: readonly string[] = ['tpub', 'upub', 'vpub', 'Upub', 'Vpub'];

function reencodeExtendedKey(key: string, targetVersion: Buffer): string {
	const decoded: Uint8Array = bs58check.decode(key);
	const out = new Uint8Array(decoded.length);
	out.set(targetVersion, 0);
	out.set(decoded.slice(4), 4);
	return bs58check.encode(out);
}

// Normalize single-sig SLIP-132 input (xpub/zpub/tpub/vpub) to the zpub/vpub form
// that the `bip84` library strictly requires.
function normalizeExtendedKey(key: string): string {
	const prefix = key.slice(0, 4);
	if (prefix === 'zpub' || prefix === 'vpub') {
		return key;
	}
	const target = prefix === 'xpub' ? SLIP132_ZPUB : prefix === 'tpub' ? SLIP132_VPUB : null;
	if (!target) {
		throw new Error(`Unsupported extended key prefix: ${prefix}`);
	}
	return reencodeExtendedKey(key, target);
}

// Pre-normalize to xpub/tpub — bip48-multisig's own normalizer throws on non-neutral
// prefixes due to a broken bs58check import.
function normalizeToNeutralPub(key: string): string {
	const prefix = key.slice(0, 4);
	if (prefix === 'xpub' || prefix === 'tpub') {
		return key;
	}
	if (MAINNET_XPUB_PREFIXES.includes(prefix)) {
		return reencodeExtendedKey(key, SLIP132_XPUB);
	}
	if (TESTNET_XPUB_PREFIXES.includes(prefix)) {
		return reencodeExtendedKey(key, SLIP132_TPUB);
	}
	throw new Error(`Unsupported extended key prefix: ${prefix}`);
}

export function isBitcoinNodelessConfigured(): boolean {
	const config = runtimeConfig.bitcoinNodeless;
	if (config.format === 'bip48') {
		return (
			(config.xpubs?.length ?? 0) >= 2 &&
			(config.m ?? 0) >= 1 &&
			(config.m ?? 0) <= (config.xpubs?.length ?? 0)
		);
	}
	return !!config.publicKey && isZPubValid(config.publicKey);
}

export function bip84Address(key: string, index: number): string {
	return new bip84.fromZPub(normalizeExtendedKey(key)).getAddress(index);
}

// export function bip84PublicKey(zpub: string, index: number): string {
// 	return new bip84.fromZPub(zpub).getPublicKey(index);
// }

export function isZPubValid(key: string): boolean {
	try {
		bip84Address(key, 0);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

// Throws on unknown prefix — a silent testnet fallback would mis-derive tb1 addresses from mainnet keys.
function detectNetworkFromXpubs(xpubs: string[]): 'mainnet' | 'testnet' {
	const prefix = xpubs[0]?.slice(0, 4) ?? '';
	if (MAINNET_XPUB_PREFIXES.includes(prefix)) {
		return 'mainnet';
	}
	if (TESTNET_XPUB_PREFIXES.includes(prefix)) {
		return 'testnet';
	}
	throw new Error(`Cannot determine Bitcoin network from xpub prefix: ${prefix}`);
}

export function bip48Address(m: number, xpubs: string[], index: number): string {
	const neutralXpubs = xpubs.map(normalizeToNeutralPub);
	const network = detectNetworkFromXpubs(neutralXpubs);
	const result = buildBip48P2wshAddress({
		m,
		xpubs: neutralXpubs,
		change: ChangeChain.External,
		index,
		network
	});
	return result.address;
}

export function generateNodelessAddress(index: number): string {
	const config = runtimeConfig.bitcoinNodeless;
	if (config.format === 'bip48') {
		if (!config.m || !config.xpubs?.length) {
			throw new Error('BIP-48 configuration incomplete: m and xpubs are required');
		}
		return bip48Address(config.m, config.xpubs, index);
	}
	return bip84Address(config.publicKey, index);
}

export async function generateDerivationIndex(): Promise<number> {
	let index = runtimeConfig.bitcoinNodeless.derivationIndex;

	if (runtimeConfig.bitcoinNodeless.skipUsedAddresses) {
		for (let attempts = 0; attempts < 10; attempts++) {
			const address = generateNodelessAddress(index);
			const isUsed = await isAddressUsed(address).catch((err) => {
				console.warn(`Failed to check if address ${address} is used:`, err);
				return false;
			});

			if (!isUsed) {
				break;
			}
			index++;
		}

		if (index >= runtimeConfig.bitcoinNodeless.derivationIndex + 10) {
			throw new Error(
				'Unable to provide the next derivation index because too many intermediate derivations are already used'
			);
		}
	}

	const updatedConfig = {
		...runtimeConfig.bitcoinNodeless,
		derivationIndex: index + 1
	};

	await persistConfigElement('bitcoinNodeless', updatedConfig);
	runtimeConfig.bitcoinNodeless = updatedConfig;
	return index;
}

export async function getSatoshiReceivedNodeless(
	address: string,
	confirmations: number,
	orderCreatedAt: Date,
	orderExpiresAt: Date
): Promise<{
	satReceived: number;
	transactions: Array<{
		currency: 'SAT';
		amount: number;
		id: string;
	}>;
}> {
	const mempoolUrl =
		trimSuffix(runtimeConfig.bitcoinNodeless.mempoolUrl, '/') + `/api/address/${address}/txs`;

	const resp = await fetch(new URL(mempoolUrl));

	if (!resp.ok) {
		console.warn(`Mempool API error: ${resp.status} ${resp.statusText} for URL: ${mempoolUrl}`);
		throw new Error('Failed to fetch transactions for ' + address + ': ' + resp.status);
	}

	const json = await resp.json();

	const res = z
		.array(
			z.object({
				txid: z.string(),
				status: z.object({
					block_height: z.number().optional(),
					block_time: z.number().optional(),
					confirmed: z.boolean()
				}),
				vout: z.array(
					z.object({
						scriptpubkey_address: z.string().optional(),
						value: z.number()
					})
				)
			})
		)
		.parse(json);

	const transactions = res
		.filter((tx) => {
			if (confirmations > 0) {
				if (
					!tx.status.block_height ||
					tx.status.block_height > runtimeConfig.bitcoinBlockHeight - confirmations + 1
				) {
					return false;
				}
			}

			if (tx.status.confirmed && tx.status.block_time) {
				const txTime = new Date(tx.status.block_time * 1000);

				if (txTime < orderCreatedAt) {
					return false;
				}

				if (txTime > orderExpiresAt) {
					return false;
				}
			}

			return true;
		})
		.filter((tx) => tx.vout.some((vout) => vout.scriptpubkey_address === address))
		.map((tx) => ({
			currency: 'SAT' as const,
			amount: sum(
				tx.vout.filter((vout) => vout.scriptpubkey_address === address).map((vout) => vout.value)
			),
			id: tx.txid
		}));

	const total = sum(transactions.map((tx) => tx.amount));

	return {
		satReceived: total,
		transactions
	};
}

export async function isAddressUsed(address: string): Promise<boolean> {
	try {
		const mempoolUrl =
			trimSuffix(runtimeConfig.bitcoinNodeless.mempoolUrl, '/') + `/api/address/${address}`;
		const resp = await fetch(new URL(mempoolUrl));
		if (!resp.ok) {
			return false;
		}
		const data = await resp.json();
		return (data.chain_stats?.tx_count ?? 0) > 0;
	} catch {
		return false;
	}
}

export async function updateBitcoinBlockHeight(): Promise<void> {
	try {
		const resp = await fetch(
			new URL(trimSuffix(runtimeConfig.bitcoinNodeless.mempoolUrl, '/') + '/api/blocks/tip/height')
		);

		if (resp.ok) {
			const blockHeight = z.number().parse(await resp.json());

			if (runtimeConfig.bitcoinBlockHeight !== blockHeight) {
				console.log('Updating bitcoin block height to', blockHeight);
				runtimeConfig.bitcoinBlockHeight = blockHeight;
				runtimeConfigUpdatedAt['bitcoinBlockHeight'] = new Date();

				await collections.runtimeConfig.updateOne(
					{
						_id: 'bitcoinBlockHeight'
					},
					{
						$set: {
							data: blockHeight,
							updatedAt: new Date()
						}
					},
					{
						upsert: true
					}
				);
			}
		}
	} catch (err) {
		console.error(
			'Failed to update bitcoin block height:',
			err instanceof Error ? err.message : err
		);
	}
}
