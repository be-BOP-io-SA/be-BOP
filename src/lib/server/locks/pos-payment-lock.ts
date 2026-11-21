import { setTimeout } from 'node:timers/promises';
import { inspect } from 'node:util';
import { collections } from '../database';
import { Lock } from '../lock';
import { checkPosPayment } from '../pos-payments';
import { processClosed } from '../process';
import { refreshPromise } from '../runtime-config';

const lock = new Lock('pos-payments');

/**
 * Checks the pending terminal payments, as the order poller does for orders: a payment that
 * arrives after the terminal left its screen is still recorded.
 */
async function maintainPosPayments() {
	await refreshPromise;

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

		for (const posPayment of pending) {
			try {
				await checkPosPayment(posPayment);
			} catch (err) {
				console.error(
					`PoS payment poller skipped payment ${posPayment._id} this round:`,
					err instanceof Error ? err.message : inspect(err, { depth: 10 })
				);
			}
		}

		await setTimeout(2_000);
	}
}

maintainPosPayments();
