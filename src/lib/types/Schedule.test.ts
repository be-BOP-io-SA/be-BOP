import { describe, expect, it } from 'vitest';
import { closingMinute, timeToMinutes } from './Schedule';

describe('closingMinute', () => {
	it('reads an ordinary closing time', () => {
		expect(closingMinute('17:00')).toBe(17 * 60);
		expect(closingMinute('09:30')).toBe(9 * 60 + 30);
	});

	it('reads midnight as the end of the day', () => {
		expect(closingMinute('00:00')).toBe(24 * 60);
	});

	// A same-day booking can never reach minute 1440, so a bound of 1440 on an ordinary
	// schedule means the closing time is not being checked at all.
	it('rejects a booking that runs past closing', () => {
		const end = closingMinute('17:00');

		expect(timeToMinutes('18:00') > end).toBe(true);
		expect(timeToMinutes('22:00') > end).toBe(true);
		expect(timeToMinutes('17:00') > end).toBe(false);
		expect(timeToMinutes('16:00') > end).toBe(false);
	});

	it('accepts a late booking on a day that closes at midnight', () => {
		const end = closingMinute('00:00');

		expect(timeToMinutes('23:00') > end).toBe(false);
		expect(timeToMinutes('22:00') > end).toBe(false);
	});
});
