import { describe, expect, it } from 'vitest';
import { cmsFromContent } from './cms';

const locals = { language: 'en' } as App.Locals;

function htmlOf(tokens: Awaited<ReturnType<typeof cmsFromContent>>['tokens']['desktop']) {
	return tokens
		.filter((token) => token.type === 'html')
		.map((token) => ('raw' in token ? token.raw : ''))
		.join('');
}

describe('cmsFromContent', () => {
	it('sanitizes a page that contains no widget at all', async () => {
		const { tokens } = await cmsFromContent(
			{ desktopContent: '<img src=x onerror="alert(1)">' },
			locals
		);

		expect(htmlOf(tokens.desktop)).not.toContain('onerror');
	});

	it('sanitizes the content trailing the last widget', async () => {
		const { tokens } = await cmsFromContent(
			{ desktopContent: '[Product=whatever]<img src=x onerror="alert(1)">' },
			locals
		);

		expect(htmlOf(tokens.desktop)).not.toContain('onerror');
	});

	it('leaves the content raw when the page opts out', async () => {
		const { tokens } = await cmsFromContent(
			{ desktopContent: '<img src=x onerror="alert(1)">', forceUnsanitizedContent: true },
			locals
		);

		expect(htmlOf(tokens.desktop)).toContain('onerror');
	});
});
