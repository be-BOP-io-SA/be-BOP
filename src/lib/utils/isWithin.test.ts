import { describe, expect, it } from 'vitest';
import { isWithin } from './isWithin';

describe('isWithin', () => {
	it('is true from the start of the window up to, not including, its end', () => {
		expect([1000, 1500, 1999, 2000].map((now) => isWithin(1000, 1000, now))).toEqual([
			true,
			true,
			true,
			false
		]);
	});

	it('treats a clock that went back as a window that is over', () => {
		expect(isWithin(60_000, 10_000, 9_999)).toBe(false);
	});

	it('is never within a window that started at -Infinity', () => {
		expect(isWithin(60_000, -Infinity, 0)).toBe(false);
	});
});
