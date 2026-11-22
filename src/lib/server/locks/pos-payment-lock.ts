import { setTimeout } from 'node:timers/promises';
import { inspect } from 'node:util';
import { collections } from '../database';
import { Lock } from '../lock';
import { checkPosPayment } from '../pos-payments';
import { processClosed } from '../process';
import { refreshPromise } from '../runtime-config';

const lock = new Lock('pos-payments');

/** A payment the processor could not read waits longer after each failure, up to this long. */
const MAX_RETRY_DELAY_MS = 5 * 60_000;

/**
 * Checks the pending terminal payments, as the order poller does for orders: a payment that
 * arrives after the terminal left its screen is still recorded.
 */
async function maintainPosPayments() {
	await refreshPromise;

	const failing = new Map<string, { failures: number; retryAt: number }>();

	while (!processClosed) {
		if (!lock.ownsLock) {
			await setTimeout(5_000);
			continue;
		}
		const pending = await collections.posPayments
			.find({ 'payment.status': 'pending' })
			.toArray()
			.catch((err) => {
				console.error(inspect(err, { depth: 10 }));
				return [];
			});

		const pendingIds = new Set(pending.map((posPayment) => posPayment._id.toHexString()));
		for (const id of failing.keys()) {
			if (!pendingIds.has(id)) {
				failing.delete(id);
			}
		}

		for (const posPayment of pending) {
			const id = posPayment._id.toHexString();
			const previous = failing.get(id);
			if (previous && previous.retryAt > Date.now()) {
				continue;
			}
			try {
				await checkPosPayment(posPayment);
				failing.delete(id);
			} catch (err) {
				// A payment must not stay pending for good: past its deadline it ends, even when the
				// processor cannot be read.
				const { expiresAt } = posPayment.payment;
				if (expiresAt && expiresAt < new Date()) {
					await collections.posPayments.updateOne(
						{ _id: posPayment._id, 'payment.status': 'pending' },
						{ $set: { 'payment.status': 'expired', updatedAt: new Date() } }
					);
					failing.delete(id);
					console.error(
						`PoS payment ${id} expired without the processor answering:`,
						err instanceof Error ? err.message : inspect(err, { depth: 10 })
					);
					continue;
				}
				const failures = (previous?.failures ?? 0) + 1;
				failing.set(id, {
					failures,
					retryAt: Date.now() + Math.min(2_000 * 2 ** failures, MAX_RETRY_DELAY_MS)
				});
				console.error(
					`PoS payment poller skipped payment ${id} this round (failure ${failures}, retrying later):`,
					err instanceof Error ? err.message : inspect(err, { depth: 10 })
				);
			}
		}

		await setTimeout(2_000);
	}
}

maintainPosPayments();
