import { describe, expect, it, vi } from 'vitest';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';

vi.mock('$env/dynamic/private', () => ({ env: { ORIGIN: 'https://shop.example' } }));

import { GET } from './+server';

async function call(headers: Record<string, string>, user?: { roleId: string }) {
	const response = await GET({
		request: new Request('https://shop.example/.well-known/origin', { headers }),
		url: new URL('https://shop.example/.well-known/origin'),
		locals: { user }
	} as unknown as Parameters<typeof GET>[0]);
	return { status: response.status, body: await response.json() };
}

describe('GET /.well-known/origin', () => {
	it('tells a visitor whether the address they used matches ORIGIN, and nothing else', async () => {
		expect(
			await call({
				host: 'shop.example',
				'x-forwarded-proto': 'http',
				'x-forwarded-for': '10.0.0.1'
			})
		).toEqual({
			status: 200,
			body: { originMatches: false, host: 'match', protocol: 'mismatch' }
		});
		expect(
			await call({
				host: 'internal:3000',
				'x-forwarded-host': 'shop.example',
				'x-forwarded-proto': 'https'
			})
		).toEqual({ status: 200, body: { originMatches: true, host: 'match', protocol: 'match' } });
		expect(await call({ host: 'other.example' }, { roleId: CUSTOMER_ROLE_ID })).toEqual({
			status: 200,
			body: { originMatches: false, host: 'mismatch', protocol: 'unknown' }
		});
	});

	it('shows staff the configured ORIGIN and the proxy headers', async () => {
		const { body } = await call(
			{ host: 'shop.example', 'x-forwarded-for': '10.0.0.1' },
			{ roleId: 'super-admin' }
		);
		expect(body.env).toEqual({ ORIGIN: 'https://shop.example' });
		expect(body.headers['X-Forwarded-For']).toBe('10.0.0.1');
		expect(body.originMatches).toBe(true);
	});
});
