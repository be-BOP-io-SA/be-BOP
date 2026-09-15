import { afterEach, describe, expect, it } from 'vitest';
import { displaysVatIncluded, hidesVatMentions } from './vat-display';
import { runtimeConfig } from './runtime-config';

describe('vat-display', () => {
	const initial = {
		vatExempted: runtimeConfig.vatExempted,
		hideVatMentionsWhenExempted: runtimeConfig.hideVatMentionsWhenExempted,
		displayVatIncludedInProduct: runtimeConfig.displayVatIncludedInProduct
	};

	afterEach(() => {
		Object.assign(runtimeConfig, initial);
	});

	function shop(over: Partial<typeof initial>) {
		Object.assign(runtimeConfig, initial, over);
	}

	describe('hidesVatMentions', () => {
		it('stays off for a shop that charges VAT', () => {
			shop({ vatExempted: false, hideVatMentionsWhenExempted: true });

			expect(hidesVatMentions()).toBe(false);
		});

		it('turns on for a VAT-free shop that asked for it', () => {
			shop({ vatExempted: true, hideVatMentionsWhenExempted: true });

			expect(hidesVatMentions()).toBe(true);
		});

		it('leaves the mentions in place when the shop unticks the option', () => {
			shop({ vatExempted: true, hideVatMentionsWhenExempted: false });

			expect(hidesVatMentions()).toBe(false);
		});
	});

	describe('displaysVatIncluded', () => {
		it('follows the setting for a shop that charges VAT', () => {
			shop({ vatExempted: false, displayVatIncludedInProduct: true });

			expect(displaysVatIncluded()).toBe(true);
		});

		it('never prices VAT-included while the mentions are hidden', () => {
			// Otherwise the price is multiplied by a tax the shop does not charge, with nothing
			// left on screen to explain the higher figure.
			shop({
				vatExempted: true,
				hideVatMentionsWhenExempted: true,
				displayVatIncludedInProduct: true
			});

			expect(displaysVatIncluded()).toBe(false);
		});

		it('keeps the VAT-included display for an exempt shop that kept its mentions', () => {
			shop({
				vatExempted: true,
				hideVatMentionsWhenExempted: false,
				displayVatIncludedInProduct: true
			});

			expect(displaysVatIncluded()).toBe(true);
		});

		it('stays off when the shop never asked for VAT-included prices', () => {
			shop({ vatExempted: true, displayVatIncludedInProduct: false });

			expect(displaysVatIncluded()).toBe(false);
		});
	});
});
