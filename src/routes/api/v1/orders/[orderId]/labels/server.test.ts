import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const addOrderLabel = vi.fn();

vi.mock('$lib/server/api/v1/auth', () => ({
	requireApiKey: (...args: unknown[]) => requireApiKey(...args)
}));
vi.mock('$lib/server/rateLimit', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimit(...args)
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { apiV1: { corsOrigins: [] } }
}));
vi.mock('$lib/server/api/v1/orders/addLabel', () => ({
	addOrderLabel: (...args: unknown[]) => addOrderLabel(...args)
}));

import { POST } from './+server';

function call(opts?: { body?: unknown; orderId?: string; withKey?: boolean }) {
	const locals =
		opts?.withKey === false
			? {}
			: {
					apiKey: {
						_id: new ObjectId(),
						name: 't',
						scopes: ['orders:write'] as const,
						keyPrefix: 'bebop_ak_test_abcd1234'
					}
			  };
	return POST({
		request: new Request('http://localhost/api/v1/orders/ord-1/labels', {
			method: 'POST',
			headers: new Headers({ 'content-type': 'application/json' }),
			body: JSON.stringify(opts?.body ?? { labelId: 'cashless' })
		}),
		params: { orderId: opts?.orderId ?? 'ord-1' },
		locals
	} as unknown as Parameters<typeof POST>[0]);
}

describe('POST /api/v1/orders/[orderId]/labels', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		addOrderLabel.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		requireApiKey.mockImplementation(async (event: { locals: { apiKey?: unknown } }) => {
			if (!event.locals.apiKey) {
				const { apiError } = await import('$lib/server/api/v1/errors');
				return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
			}
			return event.locals.apiKey;
		});
		addOrderLabel.mockResolvedValue({
			ok: true,
			orderId: 'ord-1',
			labels: [{ id: 'cashless', name: 'Cashless' }]
		});
	});

	it('requires the write scope — reading orders is not enough to change one', async () => {
		await call();
		expect(requireApiKey.mock.calls[0][1]).toBe('orders:write');
	});

	it('401s without an API key', async () => {
		const res = await call({ withKey: false });
		expect(res.status).toBe(401);
		expect(addOrderLabel).not.toHaveBeenCalled();
	});

	it('adds the label and returns every label the order now carries', async () => {
		const res = await call();
		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({
			ok: true,
			orderId: 'ord-1',
			labels: [{ id: 'cashless', name: 'Cashless' }]
		});
		expect(addOrderLabel).toHaveBeenCalledWith({ orderId: 'ord-1', labelId: 'cashless' });
	});

	it('rejects a payload carrying anything else', async () => {
		const res = await call({ body: { labelId: 'cashless', status: 'paid' } });
		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
		expect(addOrderLabel).not.toHaveBeenCalled();
	});

	it('rejects an empty labelId', async () => {
		const res = await call({ body: { labelId: '' } });
		expect(res.status).toBe(400);
		expect(addOrderLabel).not.toHaveBeenCalled();
	});

	it('404s on an unknown order', async () => {
		addOrderLabel.mockResolvedValue({ ok: false, reason: 'ORDER_NOT_FOUND' });
		const res = await call();
		expect(res.status).toBe(404);
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'NOT_FOUND', message: 'Order not found' }
		});
	});

	it('404s on a label the shop does not have', async () => {
		addOrderLabel.mockResolvedValue({ ok: false, reason: 'LABEL_NOT_FOUND' });
		const res = await call();
		expect(res.status).toBe(404);
		await expect(res.json()).resolves.toMatchObject({
			error: { message: 'Order label not found: cashless' }
		});
	});

	it('429s when the key is over its write budget', async () => {
		checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 9 });
		const res = await call();
		expect(res.status).toBe(429);
		expect(res.headers.get('Retry-After')).toBe('9');
		expect(addOrderLabel).not.toHaveBeenCalled();
	});
});
