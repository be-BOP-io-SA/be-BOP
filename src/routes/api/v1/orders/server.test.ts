import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runtimeConfig } from '$lib/server/runtime-config';
import { ObjectId } from 'mongodb';
const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const writeBatch = vi.fn();

vi.mock('$lib/server/api/v1/auth', () => ({
	requireApiKey: (...args: unknown[]) => requireApiKey(...args)
}));
vi.mock('$lib/server/rateLimit', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimit(...args)
}));
vi.mock('$lib/server/api/v1/orders/writeBatch', () => ({
	writeBatch: (...args: unknown[]) => writeBatch(...args)
}));

import { POST } from './+server';

const validBody = {
	orders: [
		{
			externalOrderId: 'pos-1',
			currency: 'EUR',
			items: [{ productId: 'espresso', quantity: 1 }],
			payment: {
				method: 'point-of-sale',
				status: 'paid',
				amountMinor: 350,
				currency: 'EUR'
			}
		}
	]
};

function call(opts?: { origin?: string; body?: unknown }) {
	const headers = new Headers({ 'content-type': 'application/json' });
	if (opts?.origin) {
		headers.set('origin', opts.origin);
	}
	const locals = {
		apiKey: {
			_id: new ObjectId(),
			name: 't',
			scopes: ['orders:write'] as const,
			environment: 'test' as const,
			keyPrefix: 'bebop_ak_test_abcd1234'
		},
		clientIp: '203.0.113.50'
	};
	return POST({
		request: new Request('http://localhost/api/v1/orders', {
			method: 'POST',
			headers,
			body: JSON.stringify(opts?.body ?? validBody)
		}),
		locals
	} as unknown as Parameters<typeof POST>[0]);
}

describe('POST /api/v1/orders (lot D adapter)', () => {
	beforeEach(() => {
		runtimeConfig.apiV1 = { corsOrigins: ['https://allowed.example'] };
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		writeBatch.mockReset();
		requireApiKey.mockImplementation(async (event: { locals: { apiKey?: unknown } }) => {
			if (!event.locals.apiKey) {
				const { apiError } = await import('$lib/server/api/v1/errors');
				return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
			}
			return event.locals.apiKey;
		});
		writeBatch.mockResolvedValue({
			ok: true,
			status: 'ok',
			results: [{ externalOrderId: 'pos-1', status: 'created', orderId: 'ord_1' }]
		});
	});

	it('returns per-key 429 RATE_LIMITED envelope with CORS', async () => {
		checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 42 });
		const res = await call({ origin: 'https://allowed.example' });
		expect(res.status).toBe(429);
		await expect(res.json()).resolves.toEqual({
			error: {
				code: 'RATE_LIMITED',
				message: 'Too many requests for this API key'
			}
		});
		expect(res.headers.get('Retry-After')).toBe('42');
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
		expect(writeBatch).not.toHaveBeenCalled();
	});

	it('returns 401 from auth short-circuit with CORS applied by wrapper', async () => {
		const { apiError } = await import('$lib/server/api/v1/errors');
		requireApiKey.mockResolvedValue(apiError(401, 'UNAUTHORIZED', 'Invalid or revoked API key'));
		const res = await call({ origin: 'https://allowed.example' });
		expect(res.status).toBe(401);
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
		expect(checkRateLimit).not.toHaveBeenCalled();
		expect(writeBatch).not.toHaveBeenCalled();
	});

	it('returns 400 VALIDATION_ERROR for empty batch', async () => {
		const res = await call({ body: { orders: [] } });
		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'VALIDATION_ERROR' }
		});
		expect(writeBatch).not.toHaveBeenCalled();
	});

	it('returns HTTP 200 with writeBatch results for a valid batch', async () => {
		const res = await call({ origin: 'https://allowed.example' });
		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({
			ok: true,
			status: 'ok',
			results: [{ externalOrderId: 'pos-1', status: 'created', orderId: 'ord_1' }]
		});
		expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://allowed.example');
		expect(writeBatch).toHaveBeenCalledWith(
			expect.objectContaining({
				orders: expect.any(Array),
				clientIp: '203.0.113.50',
				apiKey: expect.objectContaining({ keyPrefix: 'bebop_ak_test_abcd1234' })
			})
		);
	});
});
