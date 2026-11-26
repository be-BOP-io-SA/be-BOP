import { describe, expect, it } from 'vitest';
import { stripControlChars } from './stripControlChars';

describe('stripControlChars', () => {
	it('replaces line breaks so a value cannot start a new log line', () => {
		expect(stripControlChars('hi\r\n✅ Email sent [fake]')).toBe('hi  ✅ Email sent [fake]');
	});

	it('neutralises terminal escape sequences', () => {
		expect(stripControlChars('\x1b[31mred\x1b[0m')).toBe(' [31mred [0m');
	});

	it('keeps ordinary text, accents and emoji', () => {
		expect(stripControlChars('Café ☕ – devis n°3')).toBe('Café ☕ – devis n°3');
	});
});
