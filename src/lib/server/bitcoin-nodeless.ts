// @ts-expect-error no types
import bip84 from 'bip84';
import { defaultConfig, runtimeConfig } from './runtime-config';
import { collections } from './database';
import { z } from 'zod';
import { sum } from '$lib/utils/sum';
import { trimSuffix } from '$lib/utils/trimSuffix';
import { persistConfigElement } from './utils/persistConfig';

export function isBitcoinNodelessConfigured(): boolean {
	return (
		!!runtimeConfig.bitcoinNodeless.publicKey &&
		isZPubValid(runtimeConfig.bitcoinNodeless.publicKey)
	);
}

export function bip84Address(zpub: string, index: number): string {
	return new bip84.fromZPub(zpub).getAddress(index);
}

// export function bip84PublicKey(zpub: string, index: number): string {
// 	return new bip84.fromZPub(zpub).getPublicKey(index);
// }

export function isZPubValid(zpub: string): boolean {
	try {
		new bip84.fromZPub(zpub).getAddress(0);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

export async function generateDerivationIndex(): Promise<number> {
	let index = runtimeConfig.bitcoinNodeless.derivationIndex;
	
	for (let attempts = 0; attempts < 10; attempts++) {
		const address = bip84Address(runtimeConfig.bitcoinNodeless.publicKey, index);
		const isUsed = await isAddressUsed(address).catch((err) => {
			console.warn(`Failed to check if address ${address} is used:`, err);
			return false;
		});
		
		if (!isUsed) {
			const updatedConfig = {
				...runtimeConfig.bitcoinNodeless,
				derivationIndex: index + 1
			};
			
			await persistConfigElement('bitcoinNodeless', updatedConfig);
			runtimeConfig.bitcoinNodeless = updatedConfig;
			return index;
		}
		index++;
	}
	throw new Error('Unable to provide the next derivation index because too many intermediate derivations are already used');
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
	const mempoolUrl = trimSuffix(runtimeConfig.bitcoinNodeless.mempoolUrl, '/') + `/api/address/${address}/txs`;
	
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
				if (!tx.status.block_height || 
					tx.status.block_height > runtimeConfig.bitcoinBlockHeight - confirmations + 1) {
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
		const mempoolUrl = trimSuffix(runtimeConfig.bitcoinNodeless.mempoolUrl, '/') + `/api/address/${address}`;
		const resp = await fetch(new URL(mempoolUrl));
		if (!resp.ok) return false;
		const data = await resp.json();
		return (data.chain_stats?.tx_count ?? 0) > 0;
	} catch {
		return false;
	}
}

