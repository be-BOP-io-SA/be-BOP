// @ts-expect-error no types
import bip84 from 'bip84';
import bs58check from 'bs58check';
import { ChangeChain, buildBip48P2wshAddress } from 'bip48-multisig';
import { runtimeConfig } from './runtime-config';
import { z } from 'zod';
import { sum } from '$lib/utils/sum';
import { trimSuffix } from '$lib/utils/trimSuffix';
import { isWithin } from '$lib/utils/isWithin';
import { isLaggingBlockHeight, MAX_BLOCK_HEIGHT_LAG } from '$lib/utils/isLaggingBlockHeight';
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

const MEMPOOL_RATE_LIMIT_PAUSE_MS = 60_000;
let mempoolPausedAt = -Infinity;

export class MempoolRateLimitedError extends Error {}

export function mempoolApiUrl(path: string): string {
	return trimSuffix(runtimeConfig.bitcoinNodeless.mempoolUrl, '/') + path;
}

async function fetchMempool(path: string): Promise<Response> {
	if (isWithin(MEMPOOL_RATE_LIMIT_PAUSE_MS, mempoolPausedAt)) {
		throw new MempoolRateLimitedError('Mempool requests are paused after a rate limit');
	}
	const resp = await fetch(new URL(mempoolApiUrl(path)));
	if (resp.status === 429) {
		mempoolPausedAt = Date.now();
		console.warn(
			`Mempool rate limit reached (429), pausing mempool requests for ${
				MEMPOOL_RATE_LIMIT_PAUSE_MS / 1000
			}s`
		);
		throw new MempoolRateLimitedError('Mempool answered 429');
	}
	return resp;
}

export async function getSatoshiReceivedNodeless(
	address: string,
	confirmations: number,
	orderCreatedAt: Date
): Promise<{
	satReceived: number;
	/**
	 * Funds received from address-paying TXs that are detected but NOT yet confirmed
	 * to the required threshold (mempool 0-conf, or confirmed but too shallow). Used to
	 * keep an order `pending` while a payment is in flight instead of expiring it.
	 */
	pendingSatReceived: number;
	transactions: Array<{
		currency: 'SAT';
		amount: number;
		id: string;
	}>;
}> {
	const resp = await fetchMempool(`/api/address/${address}/txs`);

	if (!resp.ok) {
		throw new Error(`Mempool API error ${resp.status} ${resp.statusText} for address ${address}`);
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

	// Relevant = TXs paying our (single-use) address, not predating the order.
	// We intentionally do NOT reject TXs confirmed after `orderExpiresAt`: a payment
	// broadcast before expiry but mined late (slow blocks) must still count as paid.
	const relevant = res
		.filter((tx) => {
			if (tx.status.confirmed && tx.status.block_time) {
				const txTime = new Date(tx.status.block_time * 1000);
				if (txTime < orderCreatedAt) {
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
			id: tx.txid,
			// Confirmed to the required depth? (confirmations === 0 → accept unconfirmed)
			confirmed:
				confirmations <= 0 ||
				(!!tx.status.block_height &&
					tx.status.block_height <= runtimeConfig.bitcoinBlockHeight - confirmations + 1)
		}));

	// `transactions` keeps its existing meaning: threshold-confirmed received funds.
	const transactions = relevant
		.filter((tx) => tx.confirmed)
		.map(({ currency, amount, id }) => ({ currency, amount, id }));

	return {
		satReceived: sum(transactions.map((tx) => tx.amount)),
		pendingSatReceived: sum(relevant.filter((tx) => !tx.confirmed).map((tx) => tx.amount)),
		transactions
	};
}

// Bypasses the rate limit pause, so polling cannot blind checkout and checkout cannot renew the pause.
export async function isAddressUsed(address: string): Promise<boolean> {
	try {
		const resp = await fetch(new URL(mempoolApiUrl(`/api/address/${address}`)));
		if (!resp.ok) {
			return false;
		}
		const data = await resp.json();
		return (data.chain_stats?.tx_count ?? 0) > 0;
	} catch {
		return false;
	}
}

export async function saveBitcoinBlockHeight(blockHeight: number): Promise<void> {
	if (isLaggingBlockHeight(blockHeight, runtimeConfig.bitcoinBlockHeight)) {
		return;
	}
	console.log('Updating bitcoin block height to', blockHeight);
	runtimeConfig.bitcoinBlockHeight = blockHeight;

	// Saves are not awaited by the socket, so two of them can reach the database out of order.
	await collections.runtimeConfig.updateOne(
		{ _id: 'bitcoinBlockHeight' },
		[
			{
				$set: {
					data: {
						$cond: [
							{
								$and: [
									{ $lte: [blockHeight, '$data'] },
									{ $lte: [{ $subtract: ['$data', blockHeight] }, MAX_BLOCK_HEIGHT_LAG] }
								]
							},
							'$data',
							blockHeight
						]
					},
					updatedAt: new Date()
				}
			}
		],
		{ upsert: true }
	);
}

const BLOCK_HEIGHT_REFRESH_MS = 60_000;
let blockHeightCheckedAt = -Infinity;

export async function updateBitcoinBlockHeight(): Promise<void> {
	if (isWithin(BLOCK_HEIGHT_REFRESH_MS, blockHeightCheckedAt)) {
		return;
	}
	blockHeightCheckedAt = Date.now();
	try {
		const resp = await fetchMempool('/api/blocks/tip/height');

		if (resp.ok) {
			await saveBitcoinBlockHeight(z.number().parse(await resp.json()));
		}
	} catch (err) {
		if (err instanceof MempoolRateLimitedError) {
			return;
		}
		console.error(
			'Failed to update bitcoin block height:',
			err instanceof Error ? err.message : err
		);
	}
}

export function resetMempoolPacing() {
	if (!import.meta.env.VITEST) {
		throw new Error('resetMempoolPacing should only be used in tests');
	}
	mempoolPausedAt = -Infinity;
	blockHeightCheckedAt = -Infinity;
}
