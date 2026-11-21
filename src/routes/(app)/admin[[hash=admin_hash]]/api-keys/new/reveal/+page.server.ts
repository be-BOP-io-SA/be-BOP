import { consumeApiKeyRevealCookie } from '$lib/server/api/reveal-flash';
import { ORIGIN } from '$lib/server/env-config';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { error } from '@sveltejs/kit';

export function load({ locals, cookies, setHeaders }) {
	if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
		throw error(403, 'Forbidden. Only Super Admin can access this page !');
	}

	setHeaders({ 'cache-control': 'no-store' });

	const reveal = consumeApiKeyRevealCookie(cookies);
	if (!reveal) {
		return { alreadyShown: true as const };
	}

	return {
		alreadyShown: false as const,
		secret: reveal.secret,
		prefix: reveal.prefix,
		id: reveal.id,
		name: reveal.name,
		// What a be-BOP-pos terminal scans to pair: the version of this format, the shop's address
		// and the key. Only for a key with `pos:read`, the one a terminal pairs with.
		...(reveal.posPairing && {
			pairing: JSON.stringify({ v: 1, url: ORIGIN.replace(/\/+$/, ''), apiKey: reveal.secret })
		})
	};
}
