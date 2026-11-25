import { beforeEach, describe, expect, it, vi } from 'vitest';
const { checkRateLimit, runtimeConfig } = vi.hoisted(() => ({
	checkRateLimit: vi.fn(),
	runtimeConfig: {
		isMaintenance: false,
		defaultLanguage: 'en',
		apiV1: { enabled: true as boolean | undefined, corsOrigins: ['https://allowed.example'] }
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

import { handleApiV1, isApiV1Path } from './middleware';

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
		runtimeConfig.apiV1.enabled = true;
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
	describe('when the shop has not switched the API on', () => {
		const NOT_FOUND = { error: { code: 'NOT_FOUND', message: 'Not found' } };
		const routes: Array<[string, string]> = [
			['POST', '/api/v1/orders'],
			['GET', '/api/v1/orders/paid'],
			['GET', '/api/v1/orders/paid/stream'],
			['GET', '/api/v1/health'],
			['GET', '/api/v1/openapi.json'],
			['GET', '/api/v1/docs'],
			['GET', '/api/v1/docs/'],
			['GET', '/api/v1/catalog/products/some-id/picture/400'],
			['OPTIONS', '/api/v1/orders'],
			['OPTIONS', '/api/v1/health']
		];

		it.each(routes)('answers a plain 404 to %s %s, with no CORS header', async (method, path) => {
			runtimeConfig.apiV1.enabled = false;
			const resolve = vi.fn();
			const event = makeEvent({ method, path, origin: 'https://allowed.example' });

			const res = await handleApiV1({ event: event as never, resolve: resolve as never });

			expect(res.status).toBe(404);
			await expect(res.json()).resolves.toEqual(NOT_FOUND);
			expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
			expect(resolve).not.toHaveBeenCalled();
		});

		it('never says it is switched off', async () => {
			runtimeConfig.apiV1.enabled = false;
			const res = await handleApiV1({
				event: makeEvent({ path: '/api/v1/health' }) as never,
				resolve: vi.fn() as never
			});

			expect(JSON.stringify(await res.json())).not.toMatch(
				/disabled|off|activ|enable|maintenance/i
			);
		});

		it('takes a setting stored before the switch existed, with no field, as off', async () => {
			runtimeConfig.apiV1.enabled = undefined;
			const resolve = vi.fn(async () => new Response('ok'));

			const res = await handleApiV1({
				event: makeEvent({ path: '/api/v1/health' }) as never,
				resolve: resolve as never
			});

			expect(res.status).toBe(404);
			expect(resolve).not.toHaveBeenCalled();
		});

		it('answers before maintenance does', async () => {
			runtimeConfig.apiV1.enabled = false;
			runtimeConfig.isMaintenance = true;

			const res = await handleApiV1({
				event: makeEvent({ method: 'POST', path: '/api/v1/orders' }) as never,
				resolve: vi.fn() as never
			});

			expect(res.status).toBe(404);
		});

		it('does not touch the rate limiter', async () => {
			runtimeConfig.apiV1.enabled = false;

			await handleApiV1({
				event: makeEvent({ method: 'POST', path: '/api/v1/orders', ip: '198.51.100.9' }) as never,
				resolve: vi.fn() as never
			});

			expect(checkRateLimit).not.toHaveBeenCalled();
		});

		it('is the only thing that changes when it is switched back on', async () => {
			runtimeConfig.apiV1.enabled = true;
			const resolve = vi.fn(async () => new Response('ok'));

			const res = await handleApiV1({
				event: makeEvent({ path: '/api/v1/health' }) as never,
				resolve: resolve as never
			});

			expect(res.status).toBe(200);
			expect(resolve).toHaveBeenCalled();
		});
	});

	// The router decodes an address before it picks the route, so these reach the API routes.
	describe('an address written with encoded characters', () => {
		const reachesTheApi = [
			'/api/v%31/health',
			'/api/v%31',
			'/api/v%31/',
			'/%61pi/v1/health',
			'/ap%69/v1/orders',
			'/api/%76%31/orders',
			'/api/v1/%6frders',
			'/api/v1/%6Frders',
			'/api/v%31/catalog/products',
			'/%61%70%69/%76%31/docs'
		];
		const notTheApi = [
			'/api/v10/health',
			'/api/v2/health',
			'/api/v1x',
			'/apiv1/health',
			'/api//v1/health',
			'/API/v1/health',
			// An encoded slash or percent stays encoded for the router, which matches no route.
			'/api%2Fv1/health',
			'/api/v1%2Fhealth',
			'/%2561pi/v1/health',
			'/api/v%2531/health',
			// Not decodable at all: no route either.
			'/api/v%zz/health'
		];

		it.each(reachesTheApi)('%s is read as the API by the hook', (path) => {
			expect(isApiV1Path(path)).toBe(true);
		});

		it.each(notTheApi)('%s is not the API, as the router agrees', (path) => {
			expect(isApiV1Path(path)).toBe(false);
		});

		it('is read as a public meta address during maintenance, as the plain one is', async () => {
			runtimeConfig.isMaintenance = true;
			const resolve = vi.fn(async () => new Response('ok'));

			const res = await handleApiV1({
				event: makeEvent({ path: '/api/v%31/health' }) as never,
				resolve: resolve as never
			});

			expect(res.status).toBe(200);
			expect(checkRateLimit).not.toHaveBeenCalled();
		});

		it('gets the 503 of maintenance on a keyed route, as the plain address does', async () => {
			runtimeConfig.isMaintenance = true;

			const res = await handleApiV1({
				event: makeEvent({ method: 'POST', path: '/api/v%31/orders' }) as never,
				resolve: vi.fn() as never
			});

			expect(res.status).toBe(503);
		});

		it('is counted by the IP limiter on a keyed route, as the plain address is', async () => {
			checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 5 });

			const res = await handleApiV1({
				event: makeEvent({ method: 'POST', path: '/api/v%31/orders', ip: '198.51.100.7' }) as never,
				resolve: vi.fn() as never
			});

			expect(res.status).toBe(429);
			expect(checkRateLimit).toHaveBeenCalledWith('198.51.100.7', 'api.v1.ip', 120, {
				minutes: 1
			});
		});

		it('is cut by the switch, like the plain address', async () => {
			runtimeConfig.apiV1.enabled = false;

			const res = await handleApiV1({
				event: makeEvent({ path: '/api/v%31/health' }) as never,
				resolve: vi.fn() as never
			});

			expect(res.status).toBe(404);
		});
	});
});
