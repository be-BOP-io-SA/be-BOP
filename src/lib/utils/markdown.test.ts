import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
	it('keeps ordinary links and text', () => {
		expect(renderMarkdown('[shop](https://example.com)')).toContain('href="https://example.com"');
		expect(renderMarkdown('[contact](mailto:a@example.com)')).toContain('mailto:a@example.com');
		expect(renderMarkdown('[terms](/terms)')).toContain('href="/terms"');
		expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>');
	});

	it('still escapes raw HTML', () => {
		expect(renderMarkdown('<img src=x onerror=alert(1)>')).not.toContain('<img');
	});

	it.each([
		['plain', '[x](javascript:alert(1))'],
		['uppercase', '[x](JaVaScRiPt:alert(1))'],
		['html entity colon', '[x](javascript&#58;alert(1))'],
		['hex entity colon', '[x](javascript&#x3a;alert(1))'],
		['embedded tab', '[x](java\tscript:alert(1))'],
		['leading spaces', '[x](   javascript:alert(1))'],
		['data uri', '[x](data:text/html,<script>alert(1)</script>)'],
		['vbscript', '[x](vbscript:msgbox(1))'],
		['reference style', '[a]: javascript:alert(1)\n\n[click][a]']
	])('drops a %s javascript link', (_label, source) => {
		const html = renderMarkdown(source);

		expect(html).not.toContain('href=');
		expect(html.toLowerCase()).not.toContain('javascript');
		expect(html.toLowerCase()).not.toContain('vbscript');
	});

	it('drops an unsafe image source', () => {
		expect(renderMarkdown('![x](javascript:alert(1))')).not.toContain('src=');
	});
});
