import { describe, expect, it } from 'vitest';
import './pp-registry';
import { getProcessor, getProcessorsForMethod } from './pp';
import { ALL_PAYMENT_METHODS, type PaymentMethod } from '../payment-methods';
import { ALL_PAYMENT_PROCESSOR_SLUGS, PROCESSORS } from '$lib/types/paymentProcessors';
import * as declarations from '$lib/payment-processors';
import { loadFront } from '$lib/payment-processors/front';

/**
 * Registration order is live behaviour: `resolveProcessor` returns the first *enabled*
 * processor of a method when the shop expressed no preference, so reordering two of them
 * quietly hands a shop's card traffic to a different acquirer.
 *
 * This is the order shops rely on today. A new processor takes its place by its `priority`
 * without being listed here; moving one of these has to change this list on purpose.
 */
const ORDER_SHOPS_RELY_ON: Partial<Record<PaymentMethod, string[]>> = {
	card: ['sumup', 'stripe'],
	lightning: ['swiss-bitcoin-pay', 'btcpay-server', 'phoenixd', 'lnd', 'blink'],
	bitcoin: ['bitcoin-nodeless', 'bitcoind']
};

describe('registration order', () => {
	for (const [method, expected] of Object.entries(ORDER_SHOPS_RELY_ON)) {
		it(`keeps the ${method} processors in the order the shop falls back to`, () => {
			expect(
				getProcessorsForMethod(method as PaymentMethod)
					.map((pp) => pp.meta.processor)
					.filter((slug) => expected.includes(slug))
			).toEqual(expected);
		});
	}

	it('gives every payment method a processor', () => {
		for (const method of ALL_PAYMENT_METHODS) {
			expect(getProcessorsForMethod(method), method).not.toHaveLength(0);
		}
	});
});

describe('the manifest agrees with the registry', () => {
	it('declares exactly the processors that register themselves', () => {
		const registered = ALL_PAYMENT_METHODS.flatMap((method) =>
			getProcessorsForMethod(method).map((pp) => pp.meta.processor)
		);
		expect([...registered].sort()).toEqual([...ALL_PAYMENT_PROCESSOR_SLUGS].sort());
	});

	it('gives each processor the method it actually serves', () => {
		for (const method of ALL_PAYMENT_METHODS) {
			for (const pp of getProcessorsForMethod(method)) {
				expect(PROCESSORS[pp.meta.processor].method).toBe(method);
			}
		}
	});

	it('ranks the processors of a method by their declared priority', () => {
		for (const method of ALL_PAYMENT_METHODS) {
			const priorities = getProcessorsForMethod(method).map(
				(pp) => PROCESSORS[pp.meta.processor].priority
			);

			expect(priorities, method).toEqual([...priorities].sort((a, b) => a - b));
		}
	});

	// Two processors of equal rank would be ordered by how their folders are named.
	it('gives no two processors of a method the same rank', () => {
		for (const method of ALL_PAYMENT_METHODS) {
			const priorities = getProcessorsForMethod(method).map(
				(pp) => PROCESSORS[pp.meta.processor].priority
			);

			expect(new Set(priorities).size, method).toBe(priorities.length);
		}
	});
});

describe('a processor with its own folder', () => {
	const folders = (files: Record<string, unknown>) =>
		Object.keys(files)
			.map((path) => path.split('/').at(-2))
			.sort();
	const declared = Object.values(declarations).map((declaration) => declaration.slug);

	it('is listed in the index under the name of its folder', () => {
		expect(folders(import.meta.glob('/src/lib/payment-processors/*/declaration.ts'))).toEqual(
			[...declared].sort()
		);
	});

	it('registers the processor it declares', () => {
		expect(folders(import.meta.glob('/src/lib/payment-processors/*/processor.server.ts'))).toEqual(
			[...declared].sort()
		);
		for (const slug of declared) {
			expect(getProcessor(slug)?.meta).toEqual({
				processor: slug,
				method: PROCESSORS[slug].method
			});
		}
	});

	it('labels every field of its settings form, unless it draws the form itself', async () => {
		for (const declaration of Object.values(declarations)) {
			const settings = (await loadFront(declaration.slug))?.settings;

			if (!('config' in declaration)) {
				expect(settings, declaration.slug).toBeUndefined();
			} else if (settings !== 'custom') {
				expect(Object.keys(settings?.fields ?? {}), declaration.slug).toEqual(
					Object.keys(declaration.config.fields)
				);
			}
		}
	});

	it('sends data to its payment form if, and only if, it declares one', () => {
		for (const declaration of Object.values(declarations)) {
			expect(!!getProcessor(declaration.slug)?.payData, declaration.slug).toBe(
				'pay' in declaration
			);
		}
	});

	// `'configKey' in declaration` is how the admin tells a processor has settings.
	it('never carries a settings key it does not have', () => {
		for (const declaration of Object.values(PROCESSORS)) {
			for (const [key, value] of Object.entries(declaration)) {
				expect(value, `${declaration.label}.${key}`).toBeDefined();
			}
		}
	});
});
