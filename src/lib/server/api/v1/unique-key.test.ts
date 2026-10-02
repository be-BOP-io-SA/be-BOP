import { describe, expect, it } from 'vitest';
import { parseUniqueKey } from './unique-key';

describe('parseUniqueKey', () => {
	it('accepts the QR-style secret from #2688', () => {
		expect(parseUniqueKey('kfdjsfeaz12845ND9xezj91820')).toBe('kfdjsfeaz12845ND9xezj91820');
	});

	it('trims whitespace', () => {
		expect(parseUniqueKey('  abc_12-Z  ')).toBe('abc_12-Z');
	});

	it('drops empty, oversized, and non-alphanumeric values (fail-closed)', () => {
		expect(parseUniqueKey('')).toBeUndefined();
		expect(parseUniqueKey('   ')).toBeUndefined();
		expect(parseUniqueKey(null)).toBeUndefined();
		expect(parseUniqueKey('has space')).toBeUndefined();
		expect(parseUniqueKey('bad/slash')).toBeUndefined();
		expect(parseUniqueKey('a'.repeat(129))).toBeUndefined();
		expect(parseUniqueKey('../etc/passwd')).toBeUndefined();
	});
});
