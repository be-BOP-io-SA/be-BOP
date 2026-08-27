import { beforeEach, describe, expect, it } from 'vitest';
import { runtimeConfig } from '$lib/server/runtime-config';

import { GET } from './+server';

describe('GET /api/v1/openapi.json', () => {
	beforeEach(() => {
		runtimeConfig.apiV1 = {
			corsOrigins: ['https://allowed.example']
		};
	});
	it('returns 200 with openapi field and CORS when Origin allowlisted', async () => {
		const res = await GET({
			request: new Request('https://shop.example/api/v1/openapi.json', {
				headers: { origin: 'https://allowed.example' }
			}),
			url: new URL('https://shop.example/api/v1/openapi.json')
		} as unknown as Parameters<typeof GET>[0]);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.openapi).toMatch(/^3\./);
		expect(body.paths['/api/v1/orders']).toBeTruthy();
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
	});
});
