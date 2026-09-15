import { Lock } from '../lock';
import { processClosed } from '../process';
import { refreshPromise } from '../runtime-config';
import { setTimeout } from 'node:timers/promises';
import { allProcessors } from '../sdk/pp';
import type { PaymentProcessorDefinition } from '../sdk/pp';

const lock = new Lock('payment-processors');

/** Stop functions of the workers currently running, keyed by processor. */
const running = new Map<string, () => void>();

function stop(processor: string): void {
	const halt = running.get(processor);
	if (!halt) {
		return;
	}
	running.delete(processor);
	try {
		halt();
	} catch (err) {
		console.error(`[payments] worker for ${processor} failed to stop`, err);
	}
}

async function start(pp: PaymentProcessorDefinition): Promise<void> {
	if (!pp.worker || running.has(pp.meta.processor)) {
		return;
	}
	// Claim the slot before awaiting, so a slow start cannot be entered twice.
	running.set(pp.meta.processor, () => undefined);
	try {
		running.set(pp.meta.processor, await pp.worker.start());
		console.log(`[payments] started the ${pp.meta.processor} worker`);
	} catch (err) {
		running.delete(pp.meta.processor);
		console.error(`[payments] worker for ${pp.meta.processor} failed to start`, err);
	}
}

/**
 * Keeps one worker per enabled processor, cluster-wide. A processor turned off in the
 * admin stops on the next pass; losing the lock stops every worker this process owns.
 */
async function maintainWorkers() {
	await refreshPromise;

	while (!processClosed) {
		if (!lock.ownsLock) {
			for (const processor of [...running.keys()]) {
				stop(processor);
			}
			await setTimeout(5_000);
			continue;
		}

		for (const pp of allProcessors()) {
			if (!pp.worker) {
				continue;
			}
			if (pp.isEnabled()) {
				await start(pp);
			} else {
				stop(pp.meta.processor);
			}
		}

		await setTimeout(10_000);
	}

	for (const processor of [...running.keys()]) {
		stop(processor);
	}
}

maintainWorkers();
