import { consumeApiKeyRevealCookie } from '$lib/server/api/reveal-flash';
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
		name: reveal.name
	};
}
