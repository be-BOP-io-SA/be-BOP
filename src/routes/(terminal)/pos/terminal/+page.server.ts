import { POS_TERMINAL_COOKIE, bearerSecret, posTerminalKey } from '$lib/server/api/pos-terminal';
import { runtimeConfig } from '$lib/server/runtime-config';

/**
 * The amount entry screen of a paired terminal. The app opens it once with
 * `Authorization: Bearer <API key>`; the key is then kept in a cookie for the pages that follow.
 */
export async function load({ request, cookies }) {
	const headerSecret = bearerSecret(request);
	const apiKey = await posTerminalKey(headerSecret ?? cookies.get(POS_TERMINAL_COOKIE));

	if (!apiKey) {
		return { paired: false as const };
	}

	if (headerSecret) {
		cookies.set(POS_TERMINAL_COOKIE, headerSecret, {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: 60 * 60 * 24 * 365
		});
	}

	return {
		paired: true as const,
		deviceName: apiKey.name,
		currency: runtimeConfig.mainCurrency
	};
}
