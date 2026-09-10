import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { ORIGIN } from '$lib/server/env-config';
import { adminPrefix } from '$lib/server/admin';
import { runtimeConfig } from '$lib/server/runtime-config';
import { building, dev } from '$app/environment';

export const API_KEY_REVEAL_COOKIE = 'bebop_api_key_reveal';
export const API_KEY_REVEAL_MAX_AGE_SECONDS = 120;

export type ApiKeyRevealPayload = {
	secret: string;
	prefix: string;
	id: string;
	name: string;
	/** Unix epoch seconds — cookie payload hard expiry. */
	exp: number;
};

const DEV_FALLBACK_SIGNING_KEY = 'dev-only-insecure-api-key-reveal';
const REVEAL_SIGNING_PURPOSE = 'bebop-api-key-reveal-v1';

/**
 * Signing material for the one-shot reveal cookie.
 * Reuses runtimeConfig.authLinkJwtSigningKey (same pattern as magic-link JWTs) —
 * no MONGODB_URL derivation and no new env var / pepper.
 */
function signingKey(): string {
	const appSecret = runtimeConfig.authLinkJwtSigningKey?.trim();
	if (appSecret) {
		return createHmac('sha256', appSecret).update(REVEAL_SIGNING_PURPOSE, 'utf8').digest('hex');
	}
	if (building || dev) {
		return DEV_FALLBACK_SIGNING_KEY;
	}
	throw new Error(
		'runtimeConfig.authLinkJwtSigningKey is required outside development to sign API key reveal cookies.'
	);
}

function b64url(buf: Buffer | string): string {
	const bytes = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : Buffer.from(buf);
	return bytes.toString('base64url');
}

function sign(payloadB64: string): string {
	return createHmac('sha256', signingKey()).update(payloadB64, 'utf8').digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
	const ba = Buffer.from(a, 'utf8');
	const bb = Buffer.from(b, 'utf8');
	if (ba.length !== bb.length) {
		return false;
	}
	return timingSafeEqual(ba, bb);
}

/** Seal a one-shot reveal payload for the httpOnly flash cookie. */
export function sealApiKeyReveal(
	payload: Omit<ApiKeyRevealPayload, 'exp'>,
	maxAgeSeconds = API_KEY_REVEAL_MAX_AGE_SECONDS
): string {
	const full: ApiKeyRevealPayload = {
		...payload,
		exp: Math.floor(Date.now() / 1000) + maxAgeSeconds
	};
	const payloadB64 = b64url(JSON.stringify(full));
	return `${payloadB64}.${sign(payloadB64)}`;
}

/** Verify and parse a sealed reveal cookie value. Returns null if invalid/expired. */
export function unsealApiKeyReveal(
	token: string | undefined | null,
	now = Date.now()
): ApiKeyRevealPayload | null {
	if (!token) {
		return null;
	}
	const dot = token.lastIndexOf('.');
	if (dot <= 0) {
		return null;
	}
	const payloadB64 = token.slice(0, dot);
	const sig = token.slice(dot + 1);
	if (!sig || !safeEqual(sign(payloadB64), sig)) {
		return null;
	}
	try {
		const parsed = JSON.parse(
			Buffer.from(payloadB64, 'base64url').toString('utf8')
		) as ApiKeyRevealPayload;
		if (
			typeof parsed.secret !== 'string' ||
			typeof parsed.prefix !== 'string' ||
			typeof parsed.id !== 'string' ||
			typeof parsed.name !== 'string' ||
			typeof parsed.exp !== 'number'
		) {
			return null;
		}
		if (parsed.exp * 1000 <= now) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

export function apiKeyRevealCookiePath(): string {
	return `${adminPrefix()}/api-keys/new/reveal`;
}

export function setApiKeyRevealCookie(
	cookies: Cookies,
	payload: Omit<ApiKeyRevealPayload, 'exp'>
): void {
	cookies.set(API_KEY_REVEAL_COOKIE, sealApiKeyReveal(payload), {
		path: apiKeyRevealCookiePath(),
		httpOnly: true,
		sameSite: 'lax',
		secure: (ORIGIN ?? '').startsWith('https://'),
		maxAge: API_KEY_REVEAL_MAX_AGE_SECONDS
	});
}

/**
 * Read + immediately clear the one-shot reveal cookie.
 * Returns the payload once; subsequent calls (or missing/invalid cookie) return null.
 */
export function consumeApiKeyRevealCookie(cookies: Cookies): ApiKeyRevealPayload | null {
	const raw = cookies.get(API_KEY_REVEAL_COOKIE);
	// Always clear — even if invalid — so a bad cookie cannot stick around.
	cookies.delete(API_KEY_REVEAL_COOKIE, { path: apiKeyRevealCookiePath() });
	return unsealApiKeyReveal(raw);
}
