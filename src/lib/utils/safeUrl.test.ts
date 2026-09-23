import { describe, expect, it } from 'vitest';
import { isSafeUrl, safeHref } from './safeUrl';

describe('isSafeUrl', () => {
	it.each(['https://example.com', 'http://example.com', 'mailto:a@example.com', 'tel:+33100'])(
		'accepts %s',
		(url) => expect(isSafeUrl(url)).toBe(true)
	);

	it.each(['/terms', 'terms', '../up', '#anchor', '?q=1'])('accepts the relative %s', (url) =>
		expect(isSafeUrl(url)).toBe(true)
	);

	it.each([
		'javascript:alert(1)',
		'JaVaScRiPt:alert(1)',
		'javascript&#58;alert(1)',
		'javascript&#x3a;alert(1)',
		// Named entities decode in an attribute just as numeric ones do.
		'javascript&colon;alert(1)',
		'javascript&#0058;alert(1)',
		'java&Tab;script:alert(1)',
		'java&NewLine;script:alert(1)',
		'  javascript:alert(1)',
		'java\tscript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)'
	])('rejects %s', (url) => expect(isSafeUrl(url)).toBe(false));
});

describe('safeHref', () => {
	it('makes a bare slug site-relative', () => {
		expect(safeHref('about')).toBe('/about');
		expect(safeHref('shop/socks')).toBe('shop/socks');
	});

	it('keeps an allowed absolute URL untouched', () => {
		expect(safeHref('https://example.com/x')).toBe('https://example.com/x');
	});

	// `&amp;` is ordinary in a query string and must survive the entity decoding above.
	it('keeps an ampersand-bearing query string', () => {
		expect(safeHref('https://example.com/s?a=1&amp;b=2')).toBe('https://example.com/s?a=1&amp;b=2');
		expect(safeHref('https://example.com/s?a=1&b=2')).toBe('https://example.com/s?a=1&b=2');
	});

	it('defuses a rejected scheme rather than rendering it', () => {
		expect(safeHref('javascript:alert(1)')).toBe('#');
		// A slash is not proof of a path: this one still carries a live scheme.
		expect(safeHref('javascript:a/**/alert(1)')).toBe('#');
	});

	it('handles a missing value', () => {
		expect(safeHref(undefined)).toBe('#');
		expect(safeHref('')).toBe('#');
	});
});
