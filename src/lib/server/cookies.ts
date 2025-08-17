import type { Cookies } from '@sveltejs/kit';
import { addYears } from 'date-fns';

import { env } from '$env/dynamic/private';
const ORIGIN = env.ORIGIN as string;

export function refreshSessionCookie(cookies: Cookies, secretSessionId: string) {
	cookies.set('bootik-session', secretSessionId, {
		path: '/',
		sameSite: 'lax',
		secure: ORIGIN.startsWith('https://'),
		httpOnly: true,
		expires: addYears(new Date(), 1)
	});
}
