import { describe, it, expect } from 'vitest';
import type { Product } from '$lib/types/Product';
import {
	isSameDayInShopTz,
	sameDayBookingStatus,
	toShopTzCalendarDayInstant
} from './sameDayBooking';

type BookingSpec = NonNullable<Product['bookingSpec']>;

function spec(overrides: Partial<BookingSpec> = {}): BookingSpec {
	return {
		slotMinutes: 1440,
		allowSameDayBooking: true,
		sameDayBookingMaxHour: '14:00',
		schedule: {
			timezone: 'Europe/Paris',
			monday: null,
			tuesday: null,
			wednesday: null,
			thursday: null,
			friday: null,
			saturday: null,
			sunday: null
		},
		...overrides
	};
}

describe('sameDayBookingStatus', () => {
	it('returns `null` for hourly bookings (rule does not apply)', () => {
		const s = spec({ slotMinutes: 60 });
		expect(sameDayBookingStatus(s, new Date('2026-06-25T08:00:00Z'))).toBe(null);
	});

	it('returns `disabled` when the admin opted out of same-day booking', () => {
		const s = spec({ allowSameDayBooking: false });
		expect(sameDayBookingStatus(s, new Date('2026-06-25T08:00:00Z'))).toBe('disabled');
	});

	it('returns `null` when same-day is allowed and the cutoff has not been crossed yet', () => {
		// Paris cutoff at 14:00; "now" is 12:00 Paris (= 10:00 UTC in summer DST).
		const s = spec({ allowSameDayBooking: true, sameDayBookingMaxHour: '14:00' });
		expect(sameDayBookingStatus(s, new Date('2026-06-25T10:00:00Z'))).toBe(null);
	});

	it('returns `cutoffPassed` once the configured cutoff hour has been crossed', () => {
		// Paris cutoff at 14:00; "now" is 16:00 Paris (= 14:00 UTC in summer DST).
		const s = spec({ allowSameDayBooking: true, sameDayBookingMaxHour: '14:00' });
		expect(sameDayBookingStatus(s, new Date('2026-06-25T14:00:00Z'))).toBe('cutoffPassed');
	});

	it("anchors the cutoff on the shop's timezone, not the visitor's", () => {
		// Shop in Singapore (UTC+8 year-round). Cutoff 14:00 Singapore = 06:00 UTC.
		const s = spec({
			allowSameDayBooking: true,
			sameDayBookingMaxHour: '14:00',
			schedule: { ...spec().schedule, timezone: 'Asia/Singapore' }
		});
		// 13:30 Singapore = 05:30 UTC → before cutoff
		expect(sameDayBookingStatus(s, new Date('2026-06-25T05:30:00Z'))).toBe(null);
		// 14:30 Singapore = 06:30 UTC → past cutoff
		expect(sameDayBookingStatus(s, new Date('2026-06-25T06:30:00Z'))).toBe('cutoffPassed');
	});
});

describe('toShopTzCalendarDayInstant', () => {
	// Inputs use `new Date(y, m, d)` (runtime-local midnight) so `format(_, 'yyyy-MM-dd')`
	// yields the intended calendar day regardless of the test runtime timezone (CI = UTC,
	// dev machines usually not). The point is *not* to test date-fns' `format`, but to lock
	// in the shop-tz serialization once the visitor's calendar day is known.

	it("serializes the picked day to midnight in the shop's tz (shop far behind UTC)", () => {
		// Shop in Pacific/Niue (UTC−11 year-round). Midnight 2026-06-25 Niue = 11:00 UTC.
		const picked = new Date(2026, 5, 25);
		expect(toShopTzCalendarDayInstant(picked, 'Pacific/Niue').toISOString()).toBe(
			'2026-06-25T11:00:00.000Z'
		);
	});

	it("serializes the picked day to midnight in the shop's tz (shop far ahead of UTC)", () => {
		// Shop in Pacific/Kiritimati (UTC+14 year-round). Midnight 2026-06-25 there = 10:00 UTC on 2026-06-24.
		const picked = new Date(2026, 5, 25);
		expect(toShopTzCalendarDayInstant(picked, 'Pacific/Kiritimati').toISOString()).toBe(
			'2026-06-24T10:00:00.000Z'
		);
	});

	it('honors DST — midnight on the day of the spring-forward transition', () => {
		// Europe/Paris switches CET→CEST on 2026-03-29 at 02:00 local. Midnight that day is
		// still CET (UTC+1), so 2026-03-29 00:00 Paris = 2026-03-28 23:00 UTC.
		const picked = new Date(2026, 2, 29);
		expect(toShopTzCalendarDayInstant(picked, 'Europe/Paris').toISOString()).toBe(
			'2026-03-28T23:00:00.000Z'
		);
	});
});

describe('isSameDayInShopTz', () => {
	it('returns true for two instants that fall on the same shop-tz calendar day', () => {
		// Shop in Europe/Paris. 2026-06-25 06:00 UTC = 08:00 Paris; 2026-06-25 21:00 UTC = 23:00 Paris.
		const a = new Date('2026-06-25T06:00:00Z');
		const b = new Date('2026-06-25T21:00:00Z');
		expect(isSameDayInShopTz(a, b, 'Europe/Paris')).toBe(true);
	});

	it('returns false when the shop-tz day boundary sits between the two instants', () => {
		// 2026-06-25 23:00 UTC = 01:00 Paris on 2026-06-26 → different Paris day than 06:00 UTC.
		const a = new Date('2026-06-25T06:00:00Z');
		const b = new Date('2026-06-25T23:00:00Z');
		expect(isSameDayInShopTz(a, b, 'Europe/Paris')).toBe(false);
	});

	it("disagrees with the visitor's calendar when the shop tz is far away", () => {
		// Shop in Pacific/Niue (UTC−11). 2026-06-25 05:00 UTC = 2026-06-24 18:00 Niue,
		// but 2026-06-25 20:00 UTC = 2026-06-25 09:00 Niue → different days *in Niue*
		// even though a visitor in UTC would see them both on 2026-06-25.
		const a = new Date('2026-06-25T05:00:00Z');
		const b = new Date('2026-06-25T20:00:00Z');
		expect(isSameDayInShopTz(a, b, 'Pacific/Niue')).toBe(false);
	});
});
