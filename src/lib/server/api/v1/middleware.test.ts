import { beforeEach, describe, expect, it, vi } from 'vitest';
const { checkRateLimit, runtimeConfig } = vi.hoisted(() => ({
	checkRateLimit: vi.fn(),
	runtimeConfig: {
		isMaintenance: false,
		defaultLanguage: 'en',
		apiV1: { corsOrigins: ['https://allowed.example'] }
	}
}));

vi.mock('$lib/server/rateLimit', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimit(...args)
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig
}));
vi.mock('$lib/server/geoip', () => ({
	countryFromIp: () => undefined
}));
vi.mock('$lib/server/utils/toIPv4Maybe', () => ({
	toIPv4Maybe: (ip: string) => ip
}));

import { handleApiV1 } from './middleware';

function makeEvent(opts: { method?: string; path?: string; origin?: string; ip?: string }) {
	const method = opts.method ?? 'GET';
	const path = opts.path ?? '/api/v1/health';
	const headers = new Headers();
	if (opts.origin) {
		headers.set('origin', opts.origin);
	}
	return {
		request: new Request(`http://localhost${path}`, { method, headers }),
		url: new URL(`http://localhost${path}`),
		locals: {} as Record<string, unknown>,
		getClientAddress: () => opts.ip ?? '203.0.113.10'
	};
}

describe('handleApiV1', () => {
	beforeEach(() => {
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		runtimeConfig.isMaintenance = false;
	});

	it('keeps GET /api/v1/health up during maintenance', async () => {
		runtimeConfig.isMaintenance = true;
		const resolve = vi.fn(async () => new Response('ok'));
		const event = makeEvent({
			method: 'GET',
			path: '/api/v1/health',
			origin: 'https://allowed.example'
		});
		const res = await handleApiV1({
			event: event as never,
			resolve: resolve as never
		});
		expect(resolve).toHaveBeenCalled();
		expect(res.status).toBe(200);
		expect(checkRateLimit).not.toHaveBeenCalled();
	});

	it('returns 503 MAINTENANCE on orders POST when maintenance is on', async () => {
		runtimeConfig.isMaintenance = true;
		const resolve = vi.fn();
		const event = makeEvent({
			method: 'POST',
			path: '/api/v1/orders',
			origin: 'https://allowed.example'
		});
		const res = await handleApiV1({
			event: event as never,
			resolve: resolve as never
		});
		expect(resolve).not.toHaveBeenCalled();
		expect(res.status).toBe(503);
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'MAINTENANCE' }
		});
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
	});

	it('keeps OPTIONS up during maintenance (CORS preflight)', async () => {
		runtimeConfig.isMaintenance = true;
		const resolve = vi.fn(async () => new Response(null, { status: 204 }));
		const event = makeEvent({ method: 'OPTIONS', path: '/api/v1/orders' });
		const res = await handleApiV1({
			event: event as never,
			resolve: resolve as never
		});
		expect(resolve).toHaveBeenCalled();
		expect(res.status).toBe(204);
		expect(checkRateLimit).not.toHaveBeenCalled();
	});

	it('skips IP rate limit for GET /api/v1/health', async () => {
		const resolve = vi.fn(async () => new Response('ok'));
		const event = makeEvent({ method: 'GET', path: '/api/v1/health', ip: '198.51.100.1' });
		await handleApiV1({ event: event as never, resolve: resolve as never });
		expect(checkRateLimit).not.toHaveBeenCalled();
		expect(resolve).toHaveBeenCalled();
	});

	it('skips IP rate limit for OPTIONS preflight', async () => {
		const resolve = vi.fn(async () => new Response(null, { status: 204 }));
		const event = makeEvent({ method: 'OPTIONS', path: '/api/v1/orders', ip: '198.51.100.2' });
		await handleApiV1({ event: event as never, resolve: resolve as never });
		expect(checkRateLimit).not.toHaveBeenCalled();
		expect(resolve).toHaveBeenCalled();
	});

	it('applies IP rate limit on POST /api/v1/orders and returns 429 envelope + CORS', async () => {
		checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 37 });
		const resolve = vi.fn();
		const event = makeEvent({
			method: 'POST',
			path: '/api/v1/orders',
			ip: '198.51.100.3',
			origin: 'https://allowed.example'
		});
		const res = await handleApiV1({
			event: event as never,
			resolve: resolve as never
		});
		expect(resolve).not.toHaveBeenCalled();
		expect(checkRateLimit).toHaveBeenCalledWith('198.51.100.3', 'api.v1.ip', 120, { minutes: 1 });
		expect(res.status).toBe(429);
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'RATE_LIMITED' }
		});
		expect(res.headers.get('Retry-After')).toBe('37');
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
	});

	it('calls IP rate limit then resolve when under limit', async () => {
		checkRateLimit.mockReturnValue({ limited: false });
		const resolve = vi.fn(async () => new Response('ok'));
		const event = makeEvent({
			method: 'POST',
			path: '/api/v1/orders',
			ip: '198.51.100.4'
		});
		const res = await handleApiV1({
			event: event as never,
			resolve: resolve as never
		});
		expect(checkRateLimit).toHaveBeenCalled();
		expect(resolve).toHaveBeenCalled();
		expect(res.status).toBe(200);
	});

	it('skips the IP bucket when clientIp is unknown instead of pooling every caller', async () => {
		checkRateLimit.mockReturnValue({ limited: false });
		const resolve = vi.fn(async () => new Response('ok'));
		const event = makeEvent({
			method: 'POST',
			path: '/api/v1/orders'
		});
		// Simulate getClientAddress failure → clientIp unset in handleApiV1
		event.getClientAddress = () => {
			throw new Error('no address');
		};
		await handleApiV1({ event: event as never, resolve: resolve as never });
		// A shared 'unknown-ip' bucket would 429 the whole API shop-wide on a misconfigured proxy.
		// The route below still requires an API key and applies its own per-key limit.
		expect(checkRateLimit).not.toHaveBeenCalled();
		expect(resolve).toHaveBeenCalled();
	});
	it('keeps GET /api/v1/openapi.json up during maintenance and skips IP RL', async () => {
		runtimeConfig.isMaintenance = true;
		const resolve = vi.fn(async () => new Response('{}'));
		const event = makeEvent({
			method: 'GET',
			path: '/api/v1/openapi.json',
			origin: 'https://allowed.example'
		});
		const res = await handleApiV1({
			event: event as never,
			resolve: resolve as never
		});
		expect(resolve).toHaveBeenCalled();
		expect(res.status).toBe(200);
		expect(checkRateLimit).not.toHaveBeenCalled();
	});

	it('keeps GET /api/v1/docs up during maintenance and skips IP RL', async () => {
		runtimeConfig.isMaintenance = true;
		const resolve = vi.fn(async () => new Response('<html></html>'));
		const event = makeEvent({ method: 'GET', path: '/api/v1/docs' });
		const res = await handleApiV1({
			event: event as never,
			resolve: resolve as never
		});
		expect(resolve).toHaveBeenCalled();
		expect(res.status).toBe(200);
		expect(checkRateLimit).not.toHaveBeenCalled();
	});
});
