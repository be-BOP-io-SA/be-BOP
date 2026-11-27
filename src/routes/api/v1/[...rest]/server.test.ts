import { beforeEach, describe, expect, it } from 'vitest';
import { runtimeConfig } from '$lib/server/runtime-config';

import { fallback } from './+server';

const NOT_FOUND = { error: { code: 'NOT_FOUND', message: 'Not found' } };

describe('an /api/v1 address no route owns', () => {
	beforeEach(() => {
		runtimeConfig.apiV1 = {
			corsOrigins: ['https://allowed.example'],
			enabled: true,
			trustExternalPricing: false
		};
	});

	it.each(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])(
		'answers a plain JSON 404 to %s',
		async (method) => {
			const res = await fallback({
				request: new Request('http://localhost/api/v1/zzz', {
					method,
					...(method === 'GET' || method === 'HEAD' ? {} : { body: '{}' })
				}),
				url: new URL('http://localhost/api/v1/zzz'),
				locals: {},
				params: {}
			} as unknown as Parameters<typeof fallback>[0]);

			expect(res.status).toBe(404);
			expect(res.headers.get('content-type')).toMatch(/application\/json/);
			await expect(res.json()).resolves.toEqual(NOT_FOUND);
		}
	);

	it('carries the CORS headers of the other routes', async () => {
		const res = await fallback({
			request: new Request('http://localhost/api/v1/zzz', {
				headers: { origin: 'https://allowed.example' }
			}),
			url: new URL('http://localhost/api/v1/zzz'),
			locals: {},
			params: {}
		} as unknown as Parameters<typeof fallback>[0]);

		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
	});
});
