import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/env-config', () => ({
	ORIGIN: 'http://localhost'
}));
vi.mock('$lib/server/admin', () => ({
	adminPrefix: () => '/admin'
}));
vi.mock('$app/environment', () => ({
	building: false,
	dev: true
}));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: {
		authLinkJwtSigningKey: 'test-auth-link-jwt-signing-key'
	}
}));

import {
	API_KEY_REVEAL_COOKIE,
	apiKeyRevealCookiePath,
	consumeApiKeyRevealCookie,
	sealApiKeyReveal,
	setApiKeyRevealCookie,
	unsealApiKeyReveal
} from './reveal-flash';
import type { Cookies } from '@sveltejs/kit';

function mockCookies(initial?: Record<string, string>) {
	const jar = new Map<string, string>(Object.entries(initial ?? {}));
	const setCalls: Array<{ name: string; value: string; opts: Record<string, unknown> }> = [];
	const deleteCalls: Array<{ name: string; opts: Record<string, unknown> }> = [];
	const cookies = {
		get: (name: string) => jar.get(name),
		set: (name: string, value: string, opts: Record<string, unknown>) => {
			jar.set(name, value);
			setCalls.push({ name, value, opts });
		},
		delete: (name: string, opts: Record<string, unknown>) => {
			jar.delete(name);
			deleteCalls.push({ name, opts });
		}
	} as unknown as Cookies;
	return { cookies, jar, setCalls, deleteCalls };
}

describe('api key reveal flash cookie', () => {
	beforeEach(() => {
		vi.useRealTimers();
	});

	it('seals and unseals a payload', () => {
		const token = sealApiKeyReveal({
			secret: 'bebop_ak_live_secretvalue',
			prefix: 'bebop_ak_live_secretv',
			id: 'abc123',
			name: 'desk'
		});
		const payload = unsealApiKeyReveal(token);
		expect(payload).toMatchObject({
			secret: 'bebop_ak_live_secretvalue',
			prefix: 'bebop_ak_live_secretv',
			id: 'abc123',
			name: 'desk'
		});
		expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
	});

	it('rejects tampered signatures', () => {
		const token = sealApiKeyReveal({
			secret: 'bebop_ak_test_x',
			prefix: 'bebop_ak_test_x',
			id: '1',
			name: 'n'
		});
		const [payloadB64] = token.split('.');
		expect(unsealApiKeyReveal(`${payloadB64}.deadbeef`)).toBeNull();
		expect(unsealApiKeyReveal('not-a-token')).toBeNull();
		expect(unsealApiKeyReveal(undefined)).toBeNull();
	});

	it('rejects expired payloads', () => {
		const token = sealApiKeyReveal({ secret: 's', prefix: 'p', id: 'i', name: 'n' }, 1);
		const now = Date.now() + 5_000;
		expect(unsealApiKeyReveal(token, now)).toBeNull();
	});

	it('setApiKeyRevealCookie writes a path-scoped httpOnly short-lived cookie', () => {
		const { cookies, setCalls } = mockCookies();
		setApiKeyRevealCookie(cookies, {
			secret: 'bebop_ak_live_abc',
			prefix: 'bebop_ak_live_abc',
			id: 'id1',
			name: 'k'
		});
		expect(setCalls).toHaveLength(1);
		expect(setCalls[0].name).toBe(API_KEY_REVEAL_COOKIE);
		expect(setCalls[0].opts).toMatchObject({
			path: '/admin/api-keys/new/reveal',
			httpOnly: true,
			sameSite: 'lax',
			secure: false,
			maxAge: 120
		});
		expect(apiKeyRevealCookiePath()).toBe('/admin/api-keys/new/reveal');
	});

	it('consumeApiKeyRevealCookie returns payload once then already-consumed (null)', () => {
		const { cookies, jar, deleteCalls } = mockCookies();
		setApiKeyRevealCookie(cookies, {
			secret: 'bebop_ak_live_once',
			prefix: 'bebop_ak_live_once',
			id: 'id-once',
			name: 'once'
		});
		expect(jar.has(API_KEY_REVEAL_COOKIE)).toBe(true);

		const first = consumeApiKeyRevealCookie(cookies);
		expect(first).toMatchObject({
			secret: 'bebop_ak_live_once',
			id: 'id-once',
			name: 'once'
		});
		expect(jar.has(API_KEY_REVEAL_COOKIE)).toBe(false);
		expect(deleteCalls[0]).toEqual({
			name: API_KEY_REVEAL_COOKIE,
			opts: { path: '/admin/api-keys/new/reveal' }
		});

		const second = consumeApiKeyRevealCookie(cookies);
		expect(second).toBeNull();
	});
});
