import { describe, expect, it } from 'vitest';
import { amountToMinor, minorToAmount, minorToPrice } from './money';

describe('api v1 money helpers', () => {
	it('round-trips EUR minor units (2 fraction digits)', () => {
		expect(minorToAmount(350, 'EUR')).toBe(3.5);
		expect(amountToMinor(3.5, 'EUR')).toBe(350);
		expect(minorToPrice(350, 'EUR')).toEqual({ amount: 3.5, currency: 'EUR' });
	});

	it('handles zero-decimal currencies (JPY)', () => {
		expect(minorToAmount(1000, 'JPY')).toBe(1000);
		expect(amountToMinor(1000, 'JPY')).toBe(1000);
	});

	it('handles SAT (0 fraction digits)', () => {
		expect(minorToAmount(42, 'SAT')).toBe(42);
		expect(amountToMinor(42, 'SAT')).toBe(42);
	});
});
