import { apiKeyHasScope, findApiKeyBySecret, isApiKeyUsable, touchApiKey } from './keys';
import { MAX_API_KEY_SECRET_LENGTH } from './v1/auth';
import type { ApiKey } from '$lib/types/ApiKey';

/** The cookie that keeps a paired terminal signed in on the pages it opens. */
export const POS_TERMINAL_COOKIE = 'bebop-pos-terminal';

/** The key sent as `Authorization: Bearer <key>`. */
export function bearerSecret(request: Request): string | undefined {
	const match = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization')?.trim() ?? '');
	return match?.[1];
}

/**
 * The API key of a be-BOP-pos terminal: a usable key with the `pos:read` scope, the one it pairs
 * with. Records that it was just used.
 */
export async function posTerminalKey(secret: string | undefined): Promise<ApiKey | null> {
	if (!secret || secret.length > MAX_API_KEY_SECRET_LENGTH) {
		return null;
	}
	const apiKey = await findApiKeyBySecret(secret);
	if (!apiKey || !isApiKeyUsable(apiKey) || !apiKeyHasScope(apiKey, 'pos:read')) {
		return null;
	}
	void touchApiKey(apiKey._id).catch(() => undefined);
	return apiKey;
}

/**
 * The API key of the terminal behind a request of its pages: sent once as a bearer header, then
 * kept in a cookie that this sets.
 */
export async function terminalKeyOf(event: {
	request: Request;
	cookies: import('@sveltejs/kit').Cookies;
}): Promise<ApiKey | null> {
	const headerSecret = bearerSecret(event.request);
	const apiKey = await posTerminalKey(headerSecret ?? event.cookies.get(POS_TERMINAL_COOKIE));
	if (apiKey && headerSecret) {
		event.cookies.set(POS_TERMINAL_COOKIE, headerSecret, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 365
		});
	}
	return apiKey;
}

/** The cookie that keeps an operator signed in on a terminal (arm-pos). */
export const POS_OPERATOR_COOKIE = 'bebop-pos-operator';

export const operatorCookieOptions = {
	path: '/',
	httpOnly: true,
	secure: true,
	sameSite: 'strict' as const,
	maxAge: 24 * 60 * 60
};
