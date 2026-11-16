import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import {
	definePaymentProcessor,
	type CheckPaymentResult,
	type CreatePaymentParams,
	type CreatePaymentResult,
	type PaymentTransaction
} from '$lib/server/sdk/pp';
import { ZATOSHIS_PER_ZEC } from '$lib/types/Currency';
import type { Order } from '$lib/types/Order';
import { toCurrency } from '$lib/utils/toCurrency';
import {
	isValidAccountKey,
	MAX_NON_HARDENED_INDEX,
	p2pkhScript,
	transparentAddress
} from './addresses.server';
import {
	addressTransactionHeights,
	isAddressUsed,
	latestHeight,
	mempoolTransparentTransactions,
	onLightwalletd,
	transparentTransactionsAt,
	type TransparentTransaction
} from './lightwalletd.server';
import { confirmationBlocksFor } from './confirmations.server';
import declaration from './declaration';

/**
 * Zcash on transparent addresses, without a node: one t-address per payment, derived from the
 * shop's account key, and watched through public lightwalletd servers. The shop's own wallet
 * receives the funds; be-BOP only reads the chain.
 *
 * It behaves as bitcoin nodeless does: pending, then "received, waiting for confirmations" as
 * soon as the full amount is in the mempool, then paid at the confirmation threshold, or expired.
 */

/** As for bitcoin nodeless: a transaction seen in full, then gone from the mempool after the deadline. */
const MEMPOOL_DROP_GRACE_MS = 3 * 60 * 1000;
/** Shared by every check of the same round, so that the order poller asks the servers once. */
const CHAIN_STATE_MAX_AGE_MS = 15_000;
/** A Zcash block every 75 seconds on average. */
const BLOCK_INTERVAL_MS = 75_000;
const MAX_CLAIM_ATTEMPTS = 20;
/** As for bitcoin nodeless: past this many used addresses in a row, the checkout gives up. */
const MAX_SKIPPED_ADDRESSES = 10;

type ZcashNodelessConfig = typeof runtimeConfig.zcashNodeless;

type ChainState = { tip: number; mempool: TransparentTransaction[]; readAt: number };

let chain: ChainState | null = null;
let chainRead: Promise<ChainState> | null = null;

async function currentChain(): Promise<ChainState> {
	if (chain && Date.now() - chain.readAt < CHAIN_STATE_MAX_AGE_MS) {
		return chain;
	}
	chainRead ??= (async () => {
		try {
			const [tip, mempool] = await Promise.all([
				onLightwalletd(latestHeight),
				onLightwalletd(mempoolTransparentTransactions)
			]);
			chain = { tip, mempool, readAt: Date.now() };
			return chain;
		} finally {
			chainRead = null;
		}
	})();
	return chainRead;
}

/** The address to give out, past the ones a transaction already paid when the shop asks for it. */
async function firstUnusedAddress(
	config: ZcashNodelessConfig,
	usedAddresses: Map<string, boolean>
): Promise<{ index: number; address: string }> {
	for (let index = config.derivationIndex; ; index++) {
		if (index > MAX_NON_HARDENED_INDEX) {
			throw new Error('The Zcash account key has no address left, configure a new one');
		}
		if (index >= config.derivationIndex + MAX_SKIPPED_ADDRESSES) {
			throw new Error(
				'Unable to provide the next derivation index because too many intermediate derivations are already used'
			);
		}
		// Derived before anything is saved, so that a failing key does not use up an index.
		const address = transparentAddress(config.xpub, index);
		if (!config.skipUsedAddresses) {
			return { index, address };
		}
		let isUsed = usedAddresses.get(address);
		if (isUsed === undefined) {
			isUsed = await isAddressUsed(address);
			usedAddresses.set(address, isUsed);
		}
		if (!isUsed) {
			return { index, address };
		}
	}
}

/** Reserves the next address: two checkouts at once never get the same one. */
async function reserveAddress(): Promise<string> {
	// Kept across retries so a lost claim does not ask the servers again for the same address.
	const usedAddresses = new Map<string, boolean>();

	for (let attempt = 0; attempt < MAX_CLAIM_ATTEMPTS; attempt++) {
		const stored = await collections.runtimeConfig.findOne({ _id: 'zcashNodeless' });
		const config = stored?.data as ZcashNodelessConfig | undefined;
		if (!config?.xpub) {
			throw new Error('Zcash nodeless is not configured');
		}
		const reserved = await firstUnusedAddress(config, usedAddresses);

		// Matching the whole config refuses a claim made against a key replaced meanwhile.
		const claimed = await collections.runtimeConfig.findOneAndUpdate(
			{ _id: 'zcashNodeless', data: config },
			{ $set: { 'data.derivationIndex': reserved.index + 1, updatedAt: new Date() } }
		);
		if (claimed.value) {
			if (reserved.index + 1 > runtimeConfig.zcashNodeless.derivationIndex) {
				runtimeConfig.zcashNodeless = {
					...runtimeConfig.zcashNodeless,
					derivationIndex: reserved.index + 1
				};
			}
			return reserved.address;
		}
	}
	throw new Error('Unable to reserve a Zcash address: too many concurrent requests');
}

const toZatoshis = (payment: Order['payments'][number]) =>
	BigInt(
		Math.round(toCurrency('ZEC', payment.price.amount, payment.price.currency) * ZATOSHIS_PER_ZEC)
	);
const toZec = (zatoshis: bigint) => Number(zatoshis) / ZATOSHIS_PER_ZEC;

const paidTo = (tx: TransparentTransaction, script: Buffer) =>
	tx.outputs
		.filter((output) => output.script.equals(script))
		.reduce((total, output) => total + output.zatoshis, 0n);

/** ZIP 321 (https://zips.z.cash/zip-0321): what a wallet reads to fill in the address, the amount and a label. */
function paymentUri(payment: Order['payments'][number]): string {
	const amount = toCurrency('ZEC', payment.price.amount, payment.price.currency)
		.toFixed(8)
		.replace(/\.?0+$/, '');
	const message = payment.label ? `&message=${encodeURIComponent(payment.label)}` : '';
	return `zcash:${payment.address ?? ''}?amount=${amount}${message}`;
}

const confirmationBlocks = (payment: Order['payments'][number]) =>
	confirmationBlocksFor(payment.price);

export default definePaymentProcessor(declaration, {
	isEnabled: () => isValidAccountKey(runtimeConfig.zcashNodeless.xpub),

	acceptsNewPayments: () => runtimeConfig.zcashNodeless.derivationIndex <= MAX_NON_HARDENED_INDEX,

	settlementCurrency: () => 'ZEC',

	presentation: { kind: 'qr', qrPayload: paymentUri, qrLink: paymentUri },

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		return {
			address: await reserveAddress(),
			processor: 'zcash-nodeless',
			// The message of the payment URI: a transparent output has no memo to carry it.
			label: `Order #${params.orderNumber}`
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order
	): Promise<CheckPaymentResult> {
		const address = payment.address;
		if (!address) {
			throw new Error('Missing address on zcash-nodeless payment');
		}
		if (!payment.expiresAt) {
			throw new Error('Zcash nodeless payment missing expiresAt');
		}

		const script = p2pkhScript(address);
		const required = toZatoshis(payment);
		const needed = confirmationBlocks(payment);
		const { tip, mempool } = await currentChain();

		// The address is new, so nothing before the payment matters. The margin covers slow blocks.
		const createdAt = payment.createdAt ?? order.createdAt;
		const elapsedBlocks = Math.ceil((Date.now() - createdAt.getTime()) / BLOCK_INTERVAL_MS);
		const start = Math.max(1, tip - Math.ceil(elapsedBlocks * 1.5) - 20);

		const mined = new Map<string, { zatoshis: bigint; height: number }>();
		const heights = await onLightwalletd((server) =>
			addressTransactionHeights(server, address, start, tip)
		);
		for (const height of heights) {
			const txs = await onLightwalletd((server) => transparentTransactionsAt(server, height));
			for (const tx of txs) {
				const zatoshis = paidTo(tx, script);
				if (zatoshis > 0n) {
					mined.set(tx.txid, { zatoshis, height });
				}
			}
		}

		const inMempool = mempool
			.filter((tx) => !mined.has(tx.txid))
			.reduce((total, tx) => total + paidTo(tx, script), 0n);

		let confirmed = needed <= 0 ? inMempool : 0n;
		let notYetConfirmed = needed <= 0 ? 0n : inMempool;
		const transactions: PaymentTransaction[] = [];
		for (const [txid, { zatoshis, height }] of mined) {
			if (tip - height + 1 >= needed) {
				confirmed += zatoshis;
				transactions.push({
					id: txid,
					amount: toZec(zatoshis),
					currency: 'ZEC',
					reference: `block ${height}`
				});
			} else {
				notYetConfirmed += zatoshis;
			}
		}

		if (confirmed >= required) {
			return {
				status: 'paid',
				received: { amount: toZec(confirmed), currency: 'ZEC' },
				transactions
			};
		}

		// The full amount is out there, mined too recently or still in the mempool: hold the order.
		if (confirmed + notYetConfirmed >= required) {
			return {
				status: 'pending',
				provisional: {
					received: { amount: toZec(confirmed + notYetConfirmed), currency: 'ZEC' }
				},
				state: {},
				transactions
			};
		}

		const now = new Date();
		if (payment.expiresAt < now) {
			// Past the deadline with no full amount in sight. A transaction already seen in full may
			// have left the mempool for a moment: wait the grace window before expiring.
			if (payment.awaitingConfirmation) {
				const missingSince = payment.mempoolMissingSince ?? now;
				if (now.getTime() - missingSince.getTime() < MEMPOOL_DROP_GRACE_MS) {
					return {
						status: 'pending',
						provisional: {
							received: { amount: toZec(required), currency: 'ZEC' },
							reason: 'mempool-drop'
						},
						state: { mempoolMissingSince: missingSince },
						transactions
					};
				}
			}
			return { status: 'expired' };
		}

		// A partial payment stays pending until the rest arrives.
		return { status: 'pending', state: {}, transactions };
	}
});
