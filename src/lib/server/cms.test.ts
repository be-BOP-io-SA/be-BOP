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

	it('keeps msubstitute only when it opens the last run of ordered picture options', async () => {
		const { tokens } = await cmsFromContent(
			{
				desktopContent:
					'[Picture=main msubstitute=mobile position=right]' +
					'[Picture=main msubstitute=mobile fit=cover width=100]' +
					'[Picture=main width=100 msubstitute=mobile]' +
					'[Picture=a msubstitute=b msubstitute=c]'
			},
			locals
		);

		expect(
			tokens.desktop.flatMap((token) => (token.type === 'pictureWidget' ? [token.msubstitute] : []))
		).toEqual(['mobile', undefined, 'mobile', 'c']);
	});

	it('gives up on an unterminated picture widget without backtracking', async () => {
		const start = performance.now();
		const { tokens } = await cmsFromContent(
			{ desktopContent: '[Picture=a' + ' width=1 height=1 fit=cover'.repeat(14) + 'x' },
			locals
		);

		expect(tokens.desktop.some((token) => token.type === 'pictureWidget')).toBe(false);
		expect(performance.now() - start).toBeLessThan(1000);
	});
});
