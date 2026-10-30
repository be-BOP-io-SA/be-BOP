import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const requireApiKey = vi.fn();
const checkRateLimit = vi.fn();
const addOrderNote = vi.fn();

vi.mock('$lib/server/api/v1/auth', () => ({
	requireApiKey: (...args: unknown[]) => requireApiKey(...args)
}));
vi.mock('$lib/server/rateLimit', () => ({
	checkRateLimit: (...args: unknown[]) => checkRateLimit(...args)
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { apiV1: { corsOrigins: [] } }
}));
vi.mock('$lib/server/api/v1/orders/addNote', () => ({
	addOrderNote: (...args: unknown[]) => addOrderNote(...args)
}));

import { POST } from './+server';

const note = {
	content: 'Bracelet remis en main propre',
	createdAt: '2026-09-10T12:00:00.000Z',
	author: 'employee',
	alias: 'externalPartner'
};

function call(opts?: { body?: unknown; withKey?: boolean }) {
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
		request: new Request('http://localhost/api/v1/orders/ord-1/notes', {
			method: 'POST',
			headers: new Headers({ 'content-type': 'application/json' }),
			body: JSON.stringify(opts?.body ?? { content: note.content })
		}),
		params: { orderId: 'ord-1' },
		locals
	} as unknown as Parameters<typeof POST>[0]);
}

describe('POST /api/v1/orders/[orderId]/notes', () => {
	beforeEach(() => {
		requireApiKey.mockReset();
		checkRateLimit.mockReset();
		addOrderNote.mockReset();
		checkRateLimit.mockReturnValue({ limited: false });
		requireApiKey.mockImplementation(async (event: { locals: { apiKey?: unknown } }) => {
			if (!event.locals.apiKey) {
				const { apiError } = await import('$lib/server/api/v1/errors');
				return apiError(401, 'UNAUTHORIZED', 'Missing API key context');
			}
			return event.locals.apiKey;
		});
		addOrderNote.mockResolvedValue({ ok: true, orderId: 'ord-1', notes: [note] });
	});

	it('requires the write scope', async () => {
		await call();
		expect(requireApiKey.mock.calls[0][1]).toBe('orders:write');
	});

	it('401s without an API key', async () => {
		const res = await call({ withKey: false });
		expect(res.status).toBe(401);
		expect(addOrderNote).not.toHaveBeenCalled();
	});

	it('appends the note and returns every note on the order', async () => {
		const res = await call();
		expect(res.status).toBe(200);
		await expect(res.json()).resolves.toEqual({ ok: true, orderId: 'ord-1', notes: [note] });
		expect(addOrderNote).toHaveBeenCalledWith({ orderId: 'ord-1', content: note.content });
	});

	it('rejects an empty note rather than storing a blank line', async () => {
		const res = await call({ body: { content: '   ' } });
		expect(res.status).toBe(400);
		expect(addOrderNote).not.toHaveBeenCalled();
	});

	it('rejects a payload carrying anything else', async () => {
		const res = await call({ body: { content: 'x', role: 'super-admin' } });
		expect(res.status).toBe(400);
		await expect(res.json()).resolves.toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
		expect(addOrderNote).not.toHaveBeenCalled();
	});

	it('404s on an unknown order', async () => {
		addOrderNote.mockResolvedValue({ ok: false, reason: 'ORDER_NOT_FOUND' });
		const res = await call();
		expect(res.status).toBe(404);
	});

	it('429s when the key is over its write budget', async () => {
		checkRateLimit.mockReturnValue({ limited: true, retryAfterSeconds: 9 });
		const res = await call();
		expect(res.status).toBe(429);
		expect(res.headers.get('Retry-After')).toBe('9');
		expect(addOrderNote).not.toHaveBeenCalled();
	});
});
