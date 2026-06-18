import { env } from '$env/dynamic/private';
import { ORIGIN } from '$lib/server/env-config';
import type { Cookies } from '@sveltejs/kit';
import { addYears } from 'date-fns';

export const SESSION_COOKIE_NAME = env.BOOTIK_SESSION_COOKIE_NAME || 'bootik-session';

export function refreshSessionCookie(cookies: Cookies, secretSessionId: string): void {
	cookies.set(SESSION_COOKIE_NAME, secretSessionId, {
		path: '/',
		sameSite: 'lax',
		secure: ORIGIN.startsWith('https://'),
		httpOnly: true,
		expires: addYears(new Date(), 1)
	});
}
