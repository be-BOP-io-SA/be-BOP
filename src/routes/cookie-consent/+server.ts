import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { clearCookieConsent, setCookieConsent } from '$lib/server/cookies';

const bodySchema = z.object({
	value: z.enum(['accepted', 'denied', 'reset'])
});

export const POST = async ({ request, cookies }) => {
	let parsed;
	try {
		parsed = bodySchema.parse(await request.json());
	} catch {
		throw error(400, 'Invalid consent payload');
	}
	if (parsed.value === 'reset') {
		clearCookieConsent(cookies);
	} else {
		setCookieConsent(cookies, parsed.value);
	}
	return json({ ok: true });
};
