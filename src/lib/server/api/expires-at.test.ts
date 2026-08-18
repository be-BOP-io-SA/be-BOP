import { describe, expect, it } from 'vitest';
import { parseExpiresAtFormValue } from './expires-at';

describe('parseExpiresAtFormValue', () => {
	it('returns undefined for empty input', () => {
		expect(parseExpiresAtFormValue('', null)).toEqual({ ok: true, value: undefined });
		expect(parseExpiresAtFormValue(null, null)).toEqual({ ok: true, value: undefined });
	});

	it('parses ISO with Z / offset as absolute instants', () => {
		const z = parseExpiresAtFormValue('2026-08-12T14:30:00.000Z', null);
		expect(z.ok).toBe(true);
		if (z.ok) {
			expect(z.value?.toISOString()).toBe('2026-08-12T14:30:00.000Z');
		}

		const offset = parseExpiresAtFormValue('2026-08-12T16:30:00+02:00', '0');
		expect(offset.ok).toBe(true);
		if (offset.ok) {
			expect(offset.value?.toISOString()).toBe('2026-08-12T14:30:00.000Z');
		}
	});

	it('parses datetime-local with getTimezoneOffset minutes (UTC+2 → -120)', () => {
		// Wall time 16:30 in UTC+2 == 14:30Z
		const parsed = parseExpiresAtFormValue('2026-08-12T16:30', '-120');
		expect(parsed.ok).toBe(true);
		if (parsed.ok) {
			expect(parsed.value?.toISOString()).toBe('2026-08-12T14:30:00.000Z');
		}
	});

	it('prefers ISO expiresAt over expiresAtLocal', () => {
		const parsed = parseExpiresAtFormValue('2026-08-12T14:30:00.000Z', '-120', '2026-08-12T16:30');
		expect(parsed.ok).toBe(true);
		if (parsed.ok) {
			expect(parsed.value?.toISOString()).toBe('2026-08-12T14:30:00.000Z');
		}
	});

	it('uses expiresAtLocal + offset when ISO empty (no-JS fallback)', () => {
		const parsed = parseExpiresAtFormValue('', '-120', '2026-08-12T16:30');
		expect(parsed.ok).toBe(true);
		if (parsed.ok) {
			expect(parsed.value?.toISOString()).toBe('2026-08-12T14:30:00.000Z');
		}
	});

	it('parses datetime-local with UTC offset 0', () => {
		const parsed = parseExpiresAtFormValue('2026-08-12T14:30:00', '0');
		expect(parsed.ok).toBe(true);
		if (parsed.ok) {
			expect(parsed.value?.toISOString()).toBe('2026-08-12T14:30:00.000Z');
		}
	});

	it('rejects datetime-local without offset and junk values', () => {
		expect(parseExpiresAtFormValue('2026-08-12T16:30', null).ok).toBe(false);
		expect(parseExpiresAtFormValue('2026-08-12T16:30', '').ok).toBe(false);
		expect(parseExpiresAtFormValue('not-a-date', '0').ok).toBe(false);
		expect(parseExpiresAtFormValue('2026-13-99T99:99', '0').ok).toBe(false);
	});
});
