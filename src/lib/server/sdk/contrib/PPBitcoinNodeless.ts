import {
	isBitcoinNodelessConfigured,
	generateNodelessAddress,
	generateDerivationIndex,
	getSatoshiReceivedNodeless,
	updateBitcoinBlockHeight
} from '$lib/server/bitcoin-nodeless';
import { runtimeConfigUpdatedAt } from '$lib/server/runtime-config';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { getConfirmationBlocks } from '$lib/server/getConfirmationBlocks';
import { differenceInMinutes } from 'date-fns';
import { bitcoinPaymentPrice } from '../pp';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

/**
 * Once a full-amount TX has been seen in the mempool past the order's expiry deadline,
 * keep the order alive for this long after the TX disappears. Rides out the brief gap of
 * an RBF replacement (original evicted, replacement not yet propagated) or a lagging
 * mempool backend, instead of expiring an order that is actively being paid.
 */
const MEMPOOL_DROP_GRACE_MS = 3 * 60 * 1000;

export default {
	meta: { processor: 'bitcoin-nodeless', method: 'bitcoin', emoji: '₿' },

	isEnabled: () => isBitcoinNodelessConfigured(),

	paymentPrice: bitcoinPaymentPrice,

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const address = generateNodelessAddress(await generateDerivationIndex());
		return { address, processor: 'bitcoin-nodeless' };
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order
	): Promise<CheckPaymentResult> {
		if (!payment.address) {
			throw new Error('Missing address on bitcoin-nodeless payment');
		}
		if (!payment.expiresAt) {
			throw new Error('Bitcoin nodeless payment missing expiresAt');
		}

		// Rate-limited block height update (1/min)
		if (
			!runtimeConfigUpdatedAt['bitcoinBlockHeight'] ||
			differenceInMinutes(new Date(), runtimeConfigUpdatedAt['bitcoinBlockHeight']) >= 1
		) {
			await updateBitcoinBlockHeight();
		}

		const nConfirmations = getConfirmationBlocks(payment.price);
		const received = await getSatoshiReceivedNodeless(
			payment.address,
			nConfirmations,
			order.createdAt
		);

		const required = toSatoshis(payment.price.amount, payment.price.currency);

		if (received.satReceived >= required) {
			return {
				status: 'paid',
				received: { amount: received.satReceived, currency: 'SAT' },
				transactions: received.transactions
			};
		}

		const transactions = received.transactions;
		// Is a full-amount TX present in the mempool right now (unconfirmed / too shallow)?
		const seenNow = received.pendingSatReceived >= required;

		if (seenNow) {
			// Funds committed and awaiting confirmation — hold the order, clear any grace timer.
			return {
				status: 'pending',
				awaitingConfirmation: true,
				mempoolMissingSince: null,
				transactions
			};
		}

		const now = new Date();
		if (payment.expiresAt < now) {
			// Past the deadline with no TX in the mempool right now. If we had already seen a
			// full-amount TX (RBF replacement may be in flight), ride out a short grace window
			// before expiring; otherwise expire as if the TX was never seen.
			if (payment.awaitingConfirmation) {
				const missingSince = payment.mempoolMissingSince ?? now;
				if (now.getTime() - missingSince.getTime() < MEMPOOL_DROP_GRACE_MS) {
					return {
						status: 'pending',
						awaitingConfirmation: true,
						mempoolMissingSince: missingSince,
						transactions
					};
				}
			}
			return { status: 'expired' };
		}

		// Still within the deadline and no full-amount TX in the mempool: plain pending.
		return {
			status: 'pending',
			awaitingConfirmation: false,
			mempoolMissingSince: null,
			transactions
		};
	}
} satisfies PaymentProcessorDefinition;
