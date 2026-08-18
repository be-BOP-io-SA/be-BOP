import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const createApiKey = vi.fn();
const setApiKeyRevealCookie = vi.fn();

vi.mock('$lib/server/api/keys', () => ({
	createApiKey: (...args: unknown[]) => createApiKey(...args)
}));
vi.mock('$lib/server/api/reveal-flash', async () => {
	const actual = await vi.importActual<typeof import('./reveal-flash')>('./reveal-flash');
	return {
		...actual,
		setApiKeyRevealCookie: (...args: unknown[]) => setApiKeyRevealCookie(...args)
	};
});
vi.mock('$lib/server/admin', () => ({
	adminPrefix: () => '/admin'
}));
vi.mock('$lib/server/env-config', () => ({
	ORIGIN: 'http://localhost'
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: {
		authLinkJwtSigningKey: 'test-auth-link-jwt-signing-key'
	}
}));
vi.mock('$app/environment', () => ({
	building: false,
	dev: true
}));

import { actions } from '../../../routes/(app)/admin[[hash=admin_hash]]/api-keys/new/+page.server';
import { load as loadReveal } from '../../../routes/(app)/admin[[hash=admin_hash]]/api-keys/new/reveal/+page.server';
import { API_KEY_REVEAL_COOKIE, sealApiKeyReveal, consumeApiKeyRevealCookie } from './reveal-flash';
import type { Cookies } from '@sveltejs/kit';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';

function mockCookies(initial?: Record<string, string>) {
	const jar = new Map<string, string>(Object.entries(initial ?? {}));
	const cookies = {
		get: (name: string) => jar.get(name),
		set: (name: string, value: string) => {
			jar.set(name, value);
		},
		delete: (name: string) => {
			jar.delete(name);
		}
	} as unknown as Cookies;
	return { cookies, jar };
}

/** Always-valid expiry, so the suite does not rot the day a hard-coded date goes past. */
function futureIso(): string {
	return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
}

function pastIso(): string {
	return new Date(Date.now() - 60_000).toISOString();
}

describe('api key create PRG + reveal one-shot', () => {
	beforeEach(() => {
		createApiKey.mockReset();
		setApiKeyRevealCookie.mockReset();
		setApiKeyRevealCookie.mockImplementation(
			(cookies: Cookies, payload: { secret: string; prefix: string; id: string; name: string }) => {
				cookies.set(API_KEY_REVEAL_COOKIE, sealApiKeyReveal(payload), {
					path: '/admin/api-keys/new/reveal'
				} as never);
			}
		);
	});

	it('createApiKey action redirects 303 after one create and sets reveal cookie (no secret in action return)', async () => {
		const id = new ObjectId();
		createApiKey.mockResolvedValueOnce({
			apiKey: {
				_id: id,
				name: 'desk',
				keyPrefix: 'bebop_ak_live_abcd1234',
				scopes: ['orders:write']
			},
			secret: 'bebop_ak_live_abcd1234secrettoken'
		});

		const { cookies, jar } = mockCookies();
		const body = new FormData();
		body.set('name', 'desk');
		body.append('scopes', 'orders:write');
		body.set('expiresAt', futureIso());

		let thrown: unknown;
		try {
			await actions.createApiKey({
				request: new Request('http://localhost/admin/api-keys/new', { method: 'POST', body }),
				locals: { user: { roleId: SUPER_ADMIN_ROLE_ID, _id: new ObjectId() } },
				cookies
			} as never);
		} catch (e) {
			thrown = e;
		}

		expect(createApiKey).toHaveBeenCalledTimes(1);
		expect(setApiKeyRevealCookie).toHaveBeenCalledTimes(1);
		expect(jar.has(API_KEY_REVEAL_COOKIE)).toBe(true);

		const red = thrown as { status: number; location: string };
		expect(red.status).toBe(303);
		expect(red.location).toBe('/admin/api-keys/new/reveal');
	});

	it('rejects an expiry in the past instead of minting a dead-on-arrival key', async () => {
		const { cookies, jar } = mockCookies();
		const body = new FormData();
		body.set('name', 'desk');
		body.append('scopes', 'orders:write');
		body.set('expiresAt', pastIso());

		const res = (await actions.createApiKey({
			request: new Request('http://localhost/admin/api-keys/new', { method: 'POST', body }),
			locals: { user: { roleId: SUPER_ADMIN_ROLE_ID, _id: new ObjectId() } },
			cookies
		} as never)) as { status: number; data: { error: { formErrors: string[] } } };

		expect(res.status).toBe(400);
		expect(res.data.error.formErrors[0]).toMatch(/future/i);
		// No secret was generated, so nothing to reveal.
		expect(createApiKey).not.toHaveBeenCalled();
		expect(jar.has(API_KEY_REVEAL_COOKIE)).toBe(false);
	});

	it('reveal load consumes cookie once; second load reports already shown (no second create)', async () => {
		const { cookies } = mockCookies({
			[API_KEY_REVEAL_COOKIE]: sealApiKeyReveal({
				secret: 'bebop_ak_live_onceonly',
				prefix: 'bebop_ak_live_onceon',
				id: 'keyid',
				name: 'desk'
			})
		});

		const headers: Record<string, string> = {};
		const first = loadReveal({
			locals: { user: { roleId: SUPER_ADMIN_ROLE_ID } },
			cookies,
			setHeaders: (h: Record<string, string>) => Object.assign(headers, h)
		} as never);

		expect(first).toMatchObject({
			alreadyShown: false,
			secret: 'bebop_ak_live_onceonly',
			id: 'keyid'
		});
		expect(headers['cache-control']).toBe('no-store');

		const second = loadReveal({
			locals: { user: { roleId: SUPER_ADMIN_ROLE_ID } },
			cookies,
			setHeaders: () => undefined
		} as never);
		expect(second).toEqual({ alreadyShown: true });

		// Refreshing reveal must never call create again.
		expect(createApiKey).not.toHaveBeenCalled();
		expect(consumeApiKeyRevealCookie(cookies)).toBeNull();
	});

	it('create action rejects non-super-admin', async () => {
		const body = new FormData();
		body.set('name', 'x');
		body.append('scopes', 'orders:write');

		await expect(
			actions.createApiKey({
				request: new Request('http://localhost/admin/api-keys/new', { method: 'POST', body }),
				locals: { user: { roleId: 'not-super' } },
				cookies: mockCookies().cookies
			} as never)
		).rejects.toMatchObject({ status: 403 });

		expect(createApiKey).not.toHaveBeenCalled();
	});
});
