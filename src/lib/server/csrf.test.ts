import { describe, expect, it } from 'vitest';
import { refuseCrossSiteForm } from './csrf';

const url = new URL('https://shop.example/cart');
const post = (headers: Record<string, string>) =>
	new Request(url, { method: 'POST', headers, body: 'a=1' });

describe('refuseCrossSiteForm', () => {
	it('refuses a form posted from another site, or without an origin', () => {
		const form = { 'content-type': 'application/x-www-form-urlencoded' };
		expect(
			refuseCrossSiteForm(post({ ...form, origin: 'https://evil.example' }), url)?.status
		).toBe(403);
		expect(refuseCrossSiteForm(post(form), url)?.status).toBe(403);
		expect(
			refuseCrossSiteForm(post({ 'content-type': 'multipart/form-data; boundary=x' }), url)?.status
		).toBe(403);
	});

	it('lets a form from the shop itself through', () => {
		const headers = {
			'content-type': 'application/x-www-form-urlencoded',
			origin: 'https://shop.example'
		};
		expect(refuseCrossSiteForm(post(headers), url)).toBeUndefined();
	});

	it('lets JSON and reads through, whatever their origin', () => {
		expect(refuseCrossSiteForm(post({ 'content-type': 'application/json' }), url)).toBeUndefined();
		expect(refuseCrossSiteForm(new Request(url), url)).toBeUndefined();
	});

	it('answers in JSON to a client asking for JSON, as SvelteKit did', async () => {
		const response = refuseCrossSiteForm(
			post({ 'content-type': 'text/plain', accept: 'application/json' }),
			url
		);
		expect(await response?.json()).toEqual({
			message: 'Cross-site POST form submissions are forbidden'
		});
	});
});
