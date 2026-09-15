import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	allProcessors,
	getProcessor,
	getProcessorsForMethod,
	resolveProcessor,
	tapToPayProcessors
} from './pp';
import './pp-registry';
import { runtimeConfig } from '../runtime-config';
import { ALL_PAYMENT_METHODS } from '../payment-methods';

const BY_HAND = ['point-of-sale', 'free', 'bank-transfer', 'custom'] as const;

describe('methods settled by hand', () => {
	const sellerIdentity = runtimeConfig.sellerIdentity;
	const customMethods = runtimeConfig.customPaymentMethods;

	beforeEach(() => {
		runtimeConfig.sellerIdentity = {
			bank: { iban: 'FR76', bic: 'BDFEFRPP' }
		} as typeof runtimeConfig.sellerIdentity;
		runtimeConfig.customPaymentMethods = [{ id: 'c', label: 'C', instructions: '' }];
	});

	afterEach(() => {
		runtimeConfig.sellerIdentity = sellerIdentity;
		runtimeConfig.customPaymentMethods = customMethods;
	});

	it('gives every payment method a processor, so the factory names none of them', () => {
		const covered = ALL_PAYMENT_METHODS.filter(
			(method) => getProcessorsForMethod(method).length > 0
		);

		expect(covered).toEqual([...ALL_PAYMENT_METHODS]);
	});

	it('resolves the hand-settled ones without any provider configured', () => {
		for (const processor of BY_HAND) {
			const method = getProcessor(processor)?.meta.method;

			expect(method).toBeDefined();
			expect(resolveProcessor(method ?? 'free')?.meta.processor).toBe(processor);
		}
	});

	describe('polling', () => {
		it('declares no checkPayment, so the order lock never polls them', () => {
			for (const processor of BY_HAND) {
				expect(getProcessor(processor)?.checkPayment).toBeUndefined();
			}
		});

		it('leaves every provider-backed processor pollable', () => {
			const pollable = allProcessors()
				.filter((pp) => pp.checkPayment)
				.map((pp) => pp.meta.processor);

			expect(pollable).toHaveLength(allProcessors().length - BY_HAND.length);
			expect(pollable).toContain('stripe');
		});
	});

	describe('tap-to-pay', () => {
		it('reports only the processors that can watch a terminal', () => {
			// The admin form stays permissive about what it stores; capability is checked at
			// tap time. This is the list that check answers from.
			expect(tapToPayProcessors()).toEqual(['stripe']);
		});

		it('keeps the order lock from mistaking a tapped point-of-sale payment', () => {
			// Activating tap-to-pay swaps the payment's processor for the card provider while
			// the method stays 'point-of-sale'. The dispatcher's method check is what stops
			// PPStripe from settling it as an ordinary card payment.
			const pp = getProcessor('stripe');

			expect(pp?.meta.method).toBe('card');
			expect(pp?.meta.method).not.toBe('point-of-sale');
		});
	});

	// paymentMethods() short-circuits to the full list under VITEST, so the rules it now
	// delegates to are checked on the processors themselves.
	describe('availability', () => {
		it('turns bank-transfer off until the shop has bank details', () => {
			expect(getProcessor('bank-transfer')?.isEnabled()).toBe(true);

			runtimeConfig.sellerIdentity = null;

			expect(getProcessor('bank-transfer')?.isEnabled()).toBe(false);
		});

		it('turns custom off until the shop defines one', () => {
			expect(getProcessor('custom')?.isEnabled()).toBe(true);

			runtimeConfig.customPaymentMethods = [];

			expect(getProcessor('custom')?.isEnabled()).toBe(false);
		});

		it('keeps point-of-sale and free always on, since their gate is request-scoped', () => {
			runtimeConfig.sellerIdentity = null;
			runtimeConfig.customPaymentMethods = [];

			expect(getProcessor('point-of-sale')?.isEnabled()).toBe(true);
			expect(getProcessor('free')?.isEnabled()).toBe(true);
		});
	});

	describe('settlement', () => {
		it('denominates all four in the shop currency', () => {
			runtimeConfig.mainCurrency = 'EUR';

			for (const processor of BY_HAND) {
				expect(getProcessor(processor)?.settlementCurrency()).toBe('EUR');
			}
		});

		it('follows the shop changing its currency', () => {
			runtimeConfig.mainCurrency = 'CHF';

			expect(getProcessor('point-of-sale')?.settlementCurrency()).toBe('CHF');
		});
	});
});
