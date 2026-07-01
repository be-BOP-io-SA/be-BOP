import { format } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import type { Product } from '$lib/types/Product';

const FULL_DAY_MINUTES = 24 * 60;

export type SameDayBookingStatus = 'disabled' | 'cutoffPassed' | null;

/**
 * Decide whether today is bookable for an all-day booking product, in the *shop's* timezone.
 *
 * Returns:
 *  - `'disabled'` when the admin has opted out of same-day booking on this product.
 *  - `'cutoffPassed'` when same-day is allowed but the configured cutoff hour has been
 *    crossed (in `spec.schedule.timezone`, not the visitor's tz).
 *  - `null` when today is bookable, or when the rule is not applicable (slot ≠ all-day).
 *
 * Shared client + server so the date picker, the SSR data and the cart `addToCart`
 * validation cannot drift apart.
 */
export function sameDayBookingStatus(
	spec: NonNullable<Product['bookingSpec']>,
	now: Date = new Date()
): SameDayBookingStatus {
	if (spec.slotMinutes !== FULL_DAY_MINUTES) {
		return null;
	}
	if (!spec.allowSameDayBooking) {
		return 'disabled';
	}
	const maxHour = spec.sameDayBookingMaxHour ?? '14:00';
	const nowInTz = toZonedTime(now, spec.schedule.timezone);
	const [mh, mm] = maxHour.split(':').map((s) => parseInt(s, 10));
	const cutoffMinutes = mh * 60 + mm;
	const nowMinutes = nowInTz.getHours() * 60 + nowInTz.getMinutes();
	return nowMinutes >= cutoffMinutes ? 'cutoffPassed' : null;
}

/**
 * Convert a calendar day Date (interpreted in the browser's tz) into the UTC instant of
 * midnight on the same yyyy-MM-dd in the shop's timezone. Use this when serializing the
 * day the visitor picked so the cart action interprets it as the same calendar day the
 * visitor saw, even when the visitor and the shop sit in different timezones.
 */
export function toShopTzCalendarDayInstant(date: Date, timezone: string): Date {
	return fromZonedTime(format(date, 'yyyy-MM-dd') + 'T00:00:00', timezone);
}

/**
 * Same-calendar-day check evaluated in the shop's timezone. Use this in place of
 * date-fns `isSameDay` whenever "today" is meant in the shop's reference frame —
 * the default `isSameDay` compares in the browser tz and drifts as soon as the
 * visitor's tz differs from the shop's.
 */
export function isSameDayInShopTz(date: Date, now: Date, timezone: string): boolean {
	const d = toZonedTime(date, timezone);
	const n = toZonedTime(now, timezone);
	return (
		d.getFullYear() === n.getFullYear() &&
		d.getMonth() === n.getMonth() &&
		d.getDate() === n.getDate()
	);
}
