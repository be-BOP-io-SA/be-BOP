import { beforeEach, describe, expect, it } from 'vitest';
import { runtimeConfig } from '$lib/server/runtime-config';

import { GET } from './+server';

describe('GET /api/v1/docs', () => {
	beforeEach(() => {
		runtimeConfig.apiV1 = {
			corsOrigins: ['https://allowed.example']
		};
	});
	it('returns HTML Swagger UI pointing at openapi.json', async () => {
		const res = await GET({
			request: new Request('http://localhost/api/v1/docs')
		} as unknown as Parameters<typeof GET>[0]);
		expect(res.status).toBe(200);
		expect(res.headers.get('content-type')).toMatch(/text\/html/);
		const html = await res.text();
		expect(html).toContain('/api/v1/openapi.json');
		expect(html).toContain('swagger-ui');
		expect(html).toContain('integrity="sha384-');
		expect(html).toContain('crossorigin="anonymous"');
	});
});
