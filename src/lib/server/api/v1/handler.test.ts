import { afterEach, beforeEach, describe, expect, it, vi, type SpyInstance } from 'vitest';
import { ObjectId } from 'mongodb';
import { apiError } from './errors';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { AuthenticatedApiKey } from '$lib/types/ApiV1';
import { apiV1Handler, apiV1OptionsHandler } from './handler';
import * as logModule from './log';

describe('apiV1Handler', () => {
	beforeEach(() => {
		runtimeConfig.apiV1 = {
			corsOrigins: ['https://allowed.example'],
			trustExternalPricing: false
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
			corsOrigins: ['https://allowed.example'],
			trustExternalPricing: false
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

describe('apiV1Handler call journal', () => {
	const apiKey: AuthenticatedApiKey = {
		_id: new ObjectId(),
		name: 'till',
		scopes: ['orders:read'],
		keyPrefix: 'bebop_ak_test_journal1'
	};
	let write: SpyInstance;

	beforeEach(() => {
		write = vi.spyOn(logModule, 'logApiV1Event').mockImplementation(() => undefined);
		runtimeConfig.apiV1Log = {
			maxEntries: 10_000,
			logSuccesses: true,
			logErrors: true,
			logUnauthenticated: false
		};
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	/** Run one call through the handler and say whether it reached the journal. */
	async function journaled(response: () => Response, key?: AuthenticatedApiKey) {
		write.mockClear();
		const handler = apiV1Handler(async () => response());
		await handler({
			request: new Request('http://localhost/api/v1/orders'),
			url: new URL('http://localhost/api/v1/orders'),
			locals: key ? { apiKey: key } : {}
		} as unknown as Parameters<typeof handler>[0]);
		// The entry is written after the answer is returned, once its body has been read.
		await new Promise((resolve) => setTimeout(resolve, 10));
		return write.mock.calls.length > 0;
	}

	const ok = () => Response.json({ orders: [] });
	const notFound = () => apiError(404, 'NOT_FOUND', 'Order not found');
	const unauthorized = () => apiError(401, 'UNAUTHORIZED', 'Invalid or revoked API key');

	it('keeps successes and errors of a valid key by default', async () => {
		expect(await journaled(ok, apiKey)).toBe(true);
		expect(await journaled(notFound, apiKey)).toBe(true);
	});

	it('leaves successes out when the shop turned them off', async () => {
		runtimeConfig.apiV1Log.logSuccesses = false;

		expect(await journaled(ok, apiKey)).toBe(false);
		expect(await journaled(notFound, apiKey)).toBe(true);
	});

	it('leaves errors out when the shop turned them off', async () => {
		runtimeConfig.apiV1Log.logErrors = false;

		expect(await journaled(ok, apiKey)).toBe(true);
		expect(await journaled(notFound, apiKey)).toBe(false);
	});

	it('leaves calls without a valid key out by default', async () => {
		expect(await journaled(unauthorized)).toBe(false);
	});

	it('keeps calls without a valid key when asked, even with errors turned off', async () => {
		runtimeConfig.apiV1Log.logUnauthenticated = true;
		runtimeConfig.apiV1Log.logErrors = false;

		expect(await journaled(unauthorized)).toBe(true);
	});
});
