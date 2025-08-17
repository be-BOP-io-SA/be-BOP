import {
	createWallet,
	listWallets,
	listTransactions,
	getBalance,
	getBlockchainInfo,
	isBIP84Configured,
	bitcoinRpc,
	type BitcoinCommand,
	loadDiskWallets
} from '$lib/server/bitcoind';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Order } from '$lib/types/Order.js';
import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';

import { env } from '$env/dynamic/private';
const ALLOW_BITCOIN_RPC = env.ALLOW_BITCOIN_RPC;
const BIP84_XPUB = env.BIP84_XPUB;

export async function load() {
	const wallets = await listWallets();

	const transactions = wallets.length ? await listTransactions() : [];

	const orders = collections.orders
		.find({
			_id: {
				$in: transactions
					.map((item) => item.label)
					.filter((label) => label !== undefined)
					.filter((label) => label.startsWith('order:'))
					.map((label) => label.slice('order:'.length))
			}
		})
		.project<Omit<Order, 'user'>>({ user: 0, 'payments._id': 0 });

	return {
		currentWallet: runtimeConfig.bitcoinWallet,
		wallets,
		transactions: transactions.reverse(),
		balance: wallets.length ? getBalance() : 0,
		orders: orders.toArray(),
		blockchainInfo: getBlockchainInfo(),
		bip84: isBIP84Configured,
		bip84Xpub: BIP84_XPUB,
		rpc: ALLOW_BITCOIN_RPC === 'true' || ALLOW_BITCOIN_RPC === '1'
	};
}

export const actions = {
	createWallet: async function ({ request }) {
		const wallets = await listWallets();

		const formData = await request.formData();
		const walletName = z.string().trim().parse(formData.get('wallet'));

		if (wallets.some((wallet) => wallet === walletName)) {
			throw error(400, 'Wallet already exists');
		}

		await createWallet(walletName);
	},
	setCurrentWallet: async function ({ request }) {
		const formData = await request.formData();
		const walletName = z.string().trim().parse(formData.get('wallet'));

		if (!(await listWallets()).some((wallet) => wallet === walletName)) {
			throw error(400, 'Wallet does not exist');
		}

		runtimeConfig.bitcoinWallet = walletName;
		await collections.runtimeConfig.updateOne(
			{
				_id: 'bitcoinWallet'
			},
			{
				$set: {
					data: walletName,
					updatedAt: new Date()
				},
				$setOnInsert: {
					createdAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
	},
	rpc: async function ({ request }) {
		if (ALLOW_BITCOIN_RPC !== 'true' && ALLOW_BITCOIN_RPC !== '1') {
			throw error(403, 'Forbidden');
		}
		const formData = await request.formData();

		const parsed = z
			.object({ method: z.string(), params: z.string() })
			.parse(Object.fromEntries(formData));

		const resp = await bitcoinRpc(parsed.method as BitcoinCommand, JSON.parse(parsed.params));

		if (!resp.ok) {
			return fail(400, { rpcFail: (await resp.json()).error.message });
		}
		return {
			rpcSuccess: (await resp.json()).result
		};
	},
	loadWallets: async function () {
		await loadDiskWallets();
	}
};
