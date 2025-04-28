import { oauthConfig } from '$lib/server/oauth.js';
import { rateLimit } from '$lib/server/rateLimit';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { redirect } from '@sveltejs/kit';
import * as client from 'openid-client';

export const GET = async ({ params, fetch, locals, url, cookies }) => {
	rateLimit(locals.clientIp, 'oauth', 10, { minutes: 5 });

	const oauth = runtimeConfig.oauth.find((o) => o.slug === params.slug && o.enabled);

	if (!oauth) {
		return new Response('OAuth provider not found', { status: 404 });
	}

	const code_verifier = client.randomPKCECodeVerifier();
	const code_challenge = await client.calculatePKCECodeChallenge(code_verifier);

	const parameters = {
		redirect_uri: `${url.origin}/oauth/${encodeURIComponent(params.slug)}/callback`,
		scope: oauth.scope,
		code_challenge,
		code_challenge_method: 'S256',
		state: client.randomState()
	};

	const redirectTo = client.buildAuthorizationUrl(await oauthConfig(oauth, fetch), parameters);

	cookies.set('oauth_code_verifier', code_verifier, {
		httpOnly: true,
		secure: url.origin.startsWith('https'),
		sameSite: 'lax',
		path: `/oauth/${encodeURIComponent(params.slug)}/callback`
	});
	cookies.set('oauth_state', parameters.state, {
		httpOnly: true,
		secure: url.origin.startsWith('https'),
		sameSite: 'lax',
		path: `/oauth/${encodeURIComponent(params.slug)}/callback`
	});

	throw redirect(302, redirectTo);
};
