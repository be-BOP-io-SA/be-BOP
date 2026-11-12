import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const addOrderLabel = vi.fn();
const reportSuspiciousCall = vi.fn();

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
vi.mock('$lib/server/api/suspicious', () => ({
	reportSuspiciousCall: (...args: unknown[]) => reportSuspiciousCall(...args)
}));

import { POST } from './+server';

const restrictedKeyId = new ObjectId();

function call(opts?: {
	body?: unknown;
	orderId?: string;
	withKey?: boolean;
	ownOrdersOnly?: boolean;
}) {
	const locals =
		opts?.withKey === false
			? {}
			: {
					apiKey: {
						_id: opts?.ownOrdersOnly ? restrictedKeyId : new ObjectId(),
						name: 't',
						scopes: ['orders:write'] as const,
						keyPrefix: 'bebop_ak_test_abcd1234',
						...(opts?.ownOrdersOnly && { ownOrdersOnly: true })
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
		reportSuspiciousCall.mockReset();
		reportSuspiciousCall.mockResolvedValue(undefined);
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

	it('reaches only its own orders when the key is restricted to them', async () => {
		await call({ ownOrdersOnly: true });
		expect(addOrderLabel).toHaveBeenCalledWith(
			expect.objectContaining({ orderId: 'ord-1', ownedBy: restrictedKeyId })
		);
	});

	it('reaches every order when the key is not restricted', async () => {
		await call();
		expect(addOrderLabel.mock.calls[0][0]).not.toHaveProperty('ownedBy');
	});

	it('404s on an unknown order', async () => {
		addOrderLabel.mockResolvedValue({ ok: false, reason: 'ORDER_NOT_FOUND' });
		const res = await call();
		expect(res.status).toBe(404);
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'NOT_FOUND', message: 'Order not found' }
		});
	});

	it('passes the wanted look through, for a label the shop does not have yet', async () => {
		addOrderLabel.mockResolvedValue({
			ok: true,
			orderId: 'ord-1',
			labels: [{ id: 'sats-imprimes', name: 'SATs imprimés' }],
			labelCreated: true
		});

		const res = await call({
			body: { labelId: 'sats-imprimes', name: 'SATs imprimés', color: '#F7931A', icon: '⚡' }
		});

		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toMatchObject({ labelCreated: true });
		expect(addOrderLabel).toHaveBeenCalledWith({
			orderId: 'ord-1',
			labelId: 'sats-imprimes',
			label: { name: 'SATs imprimés', color: '#F7931A', icon: '⚡' }
		});
	});

	it('accepts a named CSS color', async () => {
		const res = await call({ body: { labelId: 'cashless', color: 'orange' } });
		expect(res.status).toBe(200);
		expect(addOrderLabel).toHaveBeenCalledWith(
			expect.objectContaining({ label: expect.objectContaining({ color: 'orange' }) })
		);
	});

	it('refuses a color that is neither hexadecimal nor a named CSS color', async () => {
		for (const color of [
			'notacolor',
			'rgb(0, 0, 0)',
			'#ff',
			'background: url(https://x.example/a.png)'
		]) {
			const res = await call({ body: { labelId: 'cashless', color } });
			expect(res.status).toBe(400);
			await expect(res.json()).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
		}
		expect(addOrderLabel).not.toHaveBeenCalled();
	});

	it('flags the key when the color carries a CSS declaration, and still refuses it', async () => {
		const res = await call({
			body: { labelId: 'cashless', color: 'red; background: url(https://x.example/a.png)' },
			ownOrdersOnly: true
		});

		expect(res.status).toBe(400);
		expect(addOrderLabel).not.toHaveBeenCalled();
		expect(reportSuspiciousCall).toHaveBeenCalledWith(restrictedKeyId, {
			type: 'labelColorCss',
			call: 'POST /api/v1/orders/{orderId}/labels',
			detail: 'red; background: url(https://x.example/a.png)'
		});
	});

	it('flags a url( on its own too', async () => {
		await call({ body: { labelId: 'cashless', color: 'url(https://x.example/a.png)' } });
		expect(reportSuspiciousCall).toHaveBeenCalledTimes(1);
	});

	it('refuses a color that is merely wrong without flagging the key', async () => {
		for (const color of ['notacolor', 'rgb(0, 0, 0)', '#ff']) {
			expect((await call({ body: { labelId: 'cashless', color } })).status).toBe(400);
		}
		expect(reportSuspiciousCall).not.toHaveBeenCalled();
	});

	it('does not flag a valid color', async () => {
		await call({ body: { labelId: 'cashless', color: '#F7931A' } });
		expect(reportSuspiciousCall).not.toHaveBeenCalled();
	});

	it('400s on a label id that could not be created', async () => {
		addOrderLabel.mockResolvedValue({ ok: false, reason: 'INVALID_LABEL_ID' });
		const res = await call();
		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({
			error: { code: 'VALIDATION_ERROR', details: { labelId: 'cashless' } }
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
