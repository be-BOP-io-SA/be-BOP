import { consumeApiKeyRevealCookie } from '$lib/server/api/reveal-flash';
import { collections } from '$lib/server/database';
import { ORIGIN } from '$lib/server/env-config';
import { ObjectId } from 'mongodb';
import qrcode from 'qrcode';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { error } from '@sveltejs/kit';

export async function load({ locals, cookies, setHeaders }) {
	if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
		throw error(403, 'Forbidden. Only Super Admin can access this page !');
	}

	setHeaders({ 'cache-control': 'no-store' });

	const reveal = consumeApiKeyRevealCookie(cookies);
	if (!reveal) {
		return { alreadyShown: true as const };
	}

	// A key a be-BOP-pos terminal can pair with gets the QR code the app scans: the version of this
	// format, the shop's address and the key.
	const stored = ObjectId.isValid(reveal.id)
		? await collections.apiKeys.findOne(
				{ _id: new ObjectId(reveal.id) },
				{ projection: { scopes: 1 } }
		  )
		: null;
	const pairingQrSvg = stored?.scopes.includes('pos:read')
		? (
				await qrcode.toString(
					JSON.stringify({ v: 1, url: ORIGIN.replace(/\/+$/, ''), apiKey: reveal.secret }),
					{ type: 'svg', margin: 1 }
				)
		  ).trim()
		: undefined;

	return {
		alreadyShown: false as const,
		pairingQrSvg,
		secret: reveal.secret,
		prefix: reveal.prefix,
		id: reveal.id,
		name: reveal.name
	};
}
