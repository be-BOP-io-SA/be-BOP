import { describe, expect, it, vi } from 'vitest';
import { allProcessors } from './pp';
import type { PaymentProcessorDefinition } from './pp';
import './pp-registry';

describe('processor workers', () => {
	it('exposes every registered processor to the runner', () => {
		const processors = allProcessors().map((pp) => pp.meta.processor);

		expect(processors).toContain('bitcoin-nodeless');
		expect(processors).toContain('stripe');
		expect(new Set(processors).size).toBe(processors.length);
	});

	it('declares a worker only where there is background work', async () => {
		const withWorker = allProcessors()
			.filter((pp) => pp.worker)
			.map((pp) => pp.meta.processor);

		expect(withWorker).toEqual(['bitcoin-nodeless']);
	});

	it('returns a stop function that halts the loop', async () => {
		let ticks = 0;
		const pp = {
			meta: { processor: 'taler', method: 'taler' },
			worker: {
				async start() {
					let stopped = false;
					const loop = async () => {
						while (!stopped) {
							ticks++;
							await new Promise((resolve) => globalThis.setTimeout(resolve, 1));
						}
					};
					loop();
					return () => {
						stopped = true;
					};
				}
			}
		} as unknown as PaymentProcessorDefinition;

		const stop = await pp.worker!.start();
		await vi.waitFor(() => expect(ticks).toBeGreaterThan(1));

		stop();
		const afterStop = ticks;
		await new Promise((resolve) => globalThis.setTimeout(resolve, 10));

		expect(ticks).toBe(afterStop);
	});
});
