import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiError } from './errors';
import { runtimeConfig } from '$lib/server/runtime-config';
import { apiV1Handler, apiV1OptionsHandler } from './handler';

describe('apiV1Handler', () => {
	beforeEach(() => {
		runtimeConfig.apiV1 = {
			corsOrigins: ['https://allowed.example']
		};
	});

	it('applies CORS headers on successful responses when Origin is allowlisted', async () => {
		const handler = apiV1Handler(
			async () => new Response(JSON.stringify({ ok: true }), { status: 200 })
		);
		const res = await handler({
			request: new Request('http://localhost/api/v1/health', {
				headers: { origin: 'https://allowed.example' }
			})
		} as unknown as Parameters<typeof handler>[0]);
		expect(res.status).toBe(200);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
		expect(res.headers.get('Vary')).toBe('Origin');
	});

	it('applies CORS headers on error Response envelopes (401/429/etc.)', async () => {
		const handler = apiV1Handler(async () =>
			apiError(401, 'UNAUTHORIZED', 'Missing API key (Authorization Bearer or X-Api-Key)')
		);
		const res = await handler({
			request: new Request('http://localhost/api/v1/orders', {
				method: 'POST',
				headers: { origin: 'https://allowed.example' }
			})
		} as unknown as Parameters<typeof handler>[0]);
		expect(res.status).toBe(401);
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'UNAUTHORIZED' }
		});
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
	});

	it('does not set ACAO when Origin is absent', async () => {
		const handler = apiV1Handler(async () => apiError(429, 'RATE_LIMITED', 'Too many requests'));
		const res = await handler({
			request: new Request('http://localhost/api/v1/orders', { method: 'POST' })
		} as unknown as Parameters<typeof handler>[0]);
		expect(res.status).toBe(429);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});

	it('does not set ACAO when Origin is denied', async () => {
		const handler = apiV1Handler(async () => new Response(null, { status: 204 }));
		const res = await handler({
			request: new Request('http://localhost/api/v1/orders', {
				headers: { origin: 'https://evil.example' }
			})
		} as unknown as Parameters<typeof handler>[0]);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
	});

	it('maps unexpected throws to 500 INTERNAL_ERROR and still applies CORS', async () => {
		const handler = apiV1Handler(async () => {
			throw new Error('boom');
		});
		const warn = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const res = await handler({
			request: new Request('http://localhost/api/v1/orders', {
				method: 'POST',
				headers: { origin: 'https://allowed.example' }
			})
		} as unknown as Parameters<typeof handler>[0]);
		expect(res.status).toBe(500);
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'INTERNAL_ERROR' }
		});
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
		warn.mockRestore();
	});
});

describe('apiV1OptionsHandler', () => {
	beforeEach(() => {
		runtimeConfig.apiV1 = {
			corsOrigins: ['https://allowed.example']
		};
	});

	it('returns 204 with CORS when Origin allowlisted', async () => {
		const res = await apiV1OptionsHandler({
			request: new Request('http://localhost/api/v1/orders', {
				method: 'OPTIONS',
				headers: { origin: 'https://allowed.example' }
			})
		} as unknown as Parameters<typeof apiV1OptionsHandler>[0]);
		expect(res.status).toBe(204);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
		expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST');
	});
});
