import { env } from '$env/dynamic/private';
import { ORIGIN } from '$lib/server/env-config';
import type { Cookies } from '@sveltejs/kit';
import { addMonths, addYears } from 'date-fns';

export const SESSION_COOKIE_NAME = env.BOOTIK_SESSION_COOKIE_NAME || 'bootik-session';

export function refreshSessionCookie(cookies: Cookies, secretSessionId: string) {
	cookies.set(SESSION_COOKIE_NAME, secretSessionId, {
		path: '/',
		sameSite: 'lax',
		secure: ORIGIN.startsWith('https://'),
		httpOnly: true,
		expires: addYears(new Date(), 1)
	});
}

// GDPR analytics consent cookie. Strictly essential to the consent mechanism itself, so it is
// not subject to consent on its own. Persists the visitor's accept/deny choice for 6 months
// (CNIL recommendation), after which the banner re-appears.
export const COOKIE_CONSENT_COOKIE_NAME = 'cookieConsent';
export type CookieConsentValue = 'accepted' | 'denied';

export function setCookieConsent(cookies: Cookies, value: CookieConsentValue) {
	cookies.set(COOKIE_CONSENT_COOKIE_NAME, value, {
		path: '/',
		sameSite: 'lax',
		secure: ORIGIN.startsWith('https://'),
		httpOnly: false,
		expires: addMonths(new Date(), 6)
	});
}

export function getCookieConsent(cookies: Cookies): CookieConsentValue | null {
	const v = cookies.get(COOKIE_CONSENT_COOKIE_NAME);
	return v === 'accepted' || v === 'denied' ? v : null;
}
