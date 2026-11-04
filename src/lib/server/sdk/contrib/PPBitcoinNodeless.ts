import {
	isBitcoinNodelessConfigured,
	generateNodelessAddress,
	generateDerivationIndex,
	getSatoshiReceivedNodeless,
	MempoolRateLimitedError,
	saveBitcoinBlockHeight,
	updateBitcoinBlockHeight
} from '$lib/server/bitcoin-nodeless';
import {
	isAddressWatched,
	watchMempoolAddresses,
	type MempoolEvents
} from '$lib/server/bitcoin-nodeless-ws';
import { runtimeConfig } from '$lib/server/runtime-config';
import { isLaggingBlockHeight } from '$lib/utils/isLaggingBlockHeight';
import { isWithin } from '$lib/utils/isWithin';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { getConfirmationBlocks } from '$lib/server/getConfirmationBlocks';
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

// The order loop runs every 2s, far more often than a payment needs or mempool.space tolerates.
const CHECK_INTERVAL_MS = 30_000;
// The WebSocket reports activity, so polling a watched address only covers a missed message.
const WATCHED_CHECK_INTERVAL_MS = 5 * 60_000;
const MIN_GAP_MS = 10_000;

type AddressCheck = {
	lastCheckStartedAt: number;
	lastCheckFailed: boolean;
	activitySinceCheck: boolean;
};
const checks = new Map<string, AddressCheck>();
// Heights of another mempool URL may belong to another network, so a new URL starts over.
let lastBlock: { height: number; seenAt: number; mempoolUrl: string } | undefined;

/** Times when the outcome can change with no new mempool data: the expiry and the end of the RBF grace. */
function deadlinesOf(payment: Order['payments'][number], expiresAt: Date): number[] {
	return payment.awaitingConfirmation && payment.mempoolMissingSince
		? [expiresAt.getTime(), payment.mempoolMissingSince.getTime() + MEMPOOL_DROP_GRACE_MS]
		: [expiresAt.getTime()];
}

type DueInput = { address: string; deadlines: number[]; awaitingConfirmation: boolean };

function isCheckDue(check: AddressCheck | undefined, payment: DueInput, now: number): boolean {
	if (!check) {
		return true;
	}
	if (isWithin(MIN_GAP_MS, check.lastCheckStartedAt, now)) {
		return false;
	}
	if (check.activitySinceCheck) {
		return true;
	}
	// Only a confirmation count can change with a block; unpaid addresses get an activity message.
	if (payment.awaitingConfirmation && lastBlock && lastBlock.seenAt > check.lastCheckStartedAt) {
		return true;
	}
	if (
		payment.deadlines.some((deadline) => deadline <= now && check.lastCheckStartedAt < deadline)
	) {
		return true;
	}
	const interval =
		check.lastCheckFailed || !isAddressWatched(payment.address)
			? CHECK_INTERVAL_MS
			: WATCHED_CHECK_INTERVAL_MS;
	return !isWithin(interval, check.lastCheckStartedAt, now);
}

function startCheck(address: string, now: number): void {
	// An entry older than the longest interval is due anyway, so dropping it changes nothing.
	for (const [other, check] of checks) {
		if (!isWithin(WATCHED_CHECK_INTERVAL_MS, check.lastCheckStartedAt, now)) {
			checks.delete(other);
		}
	}
	checks.set(address, {
		lastCheckStartedAt: now,
		lastCheckFailed: false,
		activitySinceCheck: false
	});
}

function restoreCheck(address: string, previous: AddressCheck | undefined): void {
	const activity = checks.get(address)?.activitySinceCheck ?? false;
	if (previous) {
		checks.set(address, {
			...previous,
			activitySinceCheck: previous.activitySinceCheck || activity
		});
	} else {
		checks.delete(address);
	}
}

function markCheckFailed(address: string): void {
	const check = checks.get(address);
	if (check) {
		check.lastCheckFailed = true;
	}
}

const mempoolEvents: MempoolEvents = {
	onActivity(address) {
		const check = checks.get(address);
		if (check) {
			check.activitySinceCheck = true;
		}
	},
	onBlock(height) {
		const mempoolUrl = runtimeConfig.bitcoinNodeless.mempoolUrl;
		const previous = lastBlock?.mempoolUrl === mempoolUrl ? lastBlock : undefined;
		if (previous && isLaggingBlockHeight(height, previous.height)) {
			return;
		}
		// The first height after startup, regaining the lock or a URL change is the current tip, not a block seen arriving.
		lastBlock = { height, seenAt: previous ? Date.now() : -Infinity, mempoolUrl };
		saveBitcoinBlockHeight(height).catch((err) =>
			console.error('Failed to save bitcoin block height:', err)
		);
	}
};

export function resetCheckScheduler() {
	if (!import.meta.env.VITEST) {
		throw new Error('resetCheckScheduler should only be used in tests');
	}
	checks.clear();
	lastBlock = undefined;
}

function storedState(payment: Order['payments'][number]): CheckPaymentResult {
	return {
		status: 'pending',
		awaitingConfirmation: payment.awaitingConfirmation ?? false,
		mempoolMissingSince: payment.mempoolMissingSince ?? null
	};
}

export default {
	meta: { processor: 'bitcoin-nodeless', method: 'bitcoin', emoji: '₿' },

	isEnabled: () => isBitcoinNodelessConfigured(),

	paymentPrice: bitcoinPaymentPrice,

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const address = generateNodelessAddress(await generateDerivationIndex());
		return { address, processor: 'bitcoin-nodeless' };
	},

	watchPendingPayments(payments) {
		if (!payments.length) {
			// Every socket closes, so the next height reported is a snapshot taken on reopening.
			lastBlock = undefined;
		}
		watchMempoolAddresses(
			payments.flatMap((payment) => payment.address ?? []),
			mempoolEvents
		);
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

		const startedAt = Date.now();
		const previous = checks.get(payment.address);
		const dueInput = {
			address: payment.address,
			deadlines: deadlinesOf(payment, payment.expiresAt),
			awaitingConfirmation: payment.awaitingConfirmation ?? false
		};
		if (!isCheckDue(previous, dueInput, startedAt)) {
			return storedState(payment);
		}
		startCheck(payment.address, startedAt);

		await updateBitcoinBlockHeight();

		const nConfirmations = getConfirmationBlocks(payment.price);
		let received: Awaited<ReturnType<typeof getSatoshiReceivedNodeless>>;
		try {
			received = await getSatoshiReceivedNodeless(payment.address, nConfirmations, order.createdAt);
		} catch (err) {
			if (err instanceof MempoolRateLimitedError) {
				restoreCheck(payment.address, previous);
				return storedState(payment);
			}
			// Throwing would let the order loop expire a payment we could not see.
			markCheckFailed(payment.address);
			console.warn(
				`Mempool check failed for payment ${payment._id}:`,
				err instanceof Error ? err.message : err
			);
			return storedState(payment);
		}

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

		// An answer fetched before the deadline cannot expire the payment; the check after it will.
		const now = new Date(startedAt);
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
