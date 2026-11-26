import { describe, expect, it } from 'vitest';
import { csvCell } from './csvCell';

describe('csvCell', () => {
	it('leaves a plain value alone', () => {
		expect(csvCell('Alice')).toBe('Alice');
		expect(csvCell(12.5)).toBe('12.5');
		expect(csvCell(undefined)).toBe('');
	});

	it('quotes separators and doubles quotes', () => {
		expect(csvCell('a,b')).toBe('"a,b"');
		expect(csvCell('say "hi"')).toBe('"say ""hi"""');
		expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
	});

	it('disarms a formula', () => {
		expect(csvCell('=HYPERLINK("https://evil","x")')).toBe(`"'=HYPERLINK(""https://evil"",""x"")"`);
		expect(csvCell('+cmd')).toBe("'+cmd");
		expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
		expect(csvCell('-2+3')).toBe("'-2+3");
	});

	it('keeps signed numbers numeric', () => {
		expect(csvCell('-12.50')).toBe('-12.50');
		expect(csvCell(-3)).toBe('-3');
		expect(csvCell('+4')).toBe('+4');
	});
});
