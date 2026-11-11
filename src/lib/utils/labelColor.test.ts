import { describe, expect, it } from 'vitest';
import { isLabelColor } from './labelColor';

describe('isLabelColor', () => {
	it('accepts hexadecimal colors of every length CSS knows', () => {
		for (const color of ['#fff', '#FFFA', '#F7931A', '#f7931a80']) {
			expect(isLabelColor(color)).toBe(true);
		}
	});

	it('accepts the named CSS colors, in any case', () => {
		for (const color of ['orange', 'RebeccaPurple', 'lightgoldenrodyellow', 'grey', 'gray']) {
			expect(isLabelColor(color)).toBe(true);
		}
	});

	it('refuses everything else', () => {
		for (const color of [
			'',
			'#ff',
			'#fffff',
			'#ggg',
			'fff',
			'notacolor',
			'transparent',
			'currentcolor',
			'rgb(0, 0, 0)',
			'red; background: url(https://example.com/x.png)',
			'background: url(https://example.com/x.png)',
			' red',
			'red;'
		]) {
			expect(isLabelColor(color)).toBe(false);
		}
	});
});
