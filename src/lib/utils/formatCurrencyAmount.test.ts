import { describe, expect, it } from 'vitest';
import { formatCurrencyAmount } from './formatCurrencyAmount';

describe('formatCurrencyAmount', () => {
	it('trims trailing zeros for whole BTC amounts', () => {
		expect(formatCurrencyAmount(420, 'BTC')).toBe('420');
	});

	it('keeps significant crypto decimals without padding to 8', () => {
		expect(formatCurrencyAmount(0.5, 'BTC')).toBe('0.5');
		expect(formatCurrencyAmount(0.00037066, 'BTC')).toBe('0.00037066');
	});

	it('keeps the currency digits for fractional fiat but drops them for whole amounts', () => {
		// Mirrors PriceTag: fractional fiat pads to the currency's digits, whole amounts don't.
		expect(formatCurrencyAmount(419.5, 'EUR')).toBe('419.50');
		expect(formatCurrencyAmount(419.567, 'EUR')).toBe('419.57');
		expect(formatCurrencyAmount(420, 'EUR')).toBe('420');
	});

	it('never shows decimals for zero-digit currencies', () => {
		expect(formatCurrencyAmount(42000000, 'SAT')).toBe('42,000,000');
	});
});
