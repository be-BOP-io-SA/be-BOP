import { json, error } from '@sveltejs/kit';
import { z } from 'zod';
import { setCookieConsent } from '$lib/server/cookies';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { RequestHandler } from './$types';

const bodySchema = z.object({
	value: z.enum(['accepted', 'denied'])
});

export const POST: RequestHandler = async ({ request, cookies }) => {
	let parsed;
	try {
		parsed = bodySchema.parse(await request.json());
	} catch {
		throw error(400, 'Invalid consent payload');
	}
	setCookieConsent(cookies, parsed.value);
	// Return the raw snippet on accept so the client can inject it in place without a full
	// page reload. The `+layout.server.ts` load gates the same field on the cookie value, so
	// a later refresh stays consistent (snippet still emitted only when accepted).
	return json({
		ok: true,
		analyticsScriptSnippet:
			parsed.value === 'accepted' ? runtimeConfig.analyticsScriptSnippet || '' : ''
	});
};
