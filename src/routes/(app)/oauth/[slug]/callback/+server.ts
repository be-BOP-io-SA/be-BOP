import { collections } from '$lib/server/database.js';
import { oauthConfig } from '$lib/server/oauth';
import { runtimeConfig } from '$lib/server/runtime-config';
import { renewSessionId } from '$lib/server/user.js';
import { redirect } from '@sveltejs/kit';
import { error } from 'console';
import { addYears } from 'date-fns';
import { ObjectId } from 'mongodb';
import * as client from 'openid-client';

export const GET = async ({ params, fetch, cookies, url, locals }) => {
	const state = cookies.get('oauth_state');
	const code_verifier = cookies.get('oauth_code_verifier');

	if (!state || !code_verifier) {
		throw error(400, 'Missing state or code_verifier');
	}

	const oauth = runtimeConfig.oauth.find((o) => o.slug === params.slug && o.enabled);

	if (!oauth) {
		throw error(404, 'OAuth provider not found: ' + params.slug);
	}

	const config = await oauthConfig(oauth, fetch);

	const tokens = await client.authorizationCodeGrant(config, url, {
		pkceCodeVerifier: code_verifier,
		expectedState: state
	});

	const claims = tokens.claims();

	if (!claims) {
		throw error(400, 'Missing claims');
	}

	console.log('tokens', tokens, claims);

	const userId = claims.sub;
	const username =
		claims.preferred_username ||
		claims.username || // Handle wp-oauth-server
		claims.display_name || // Handle wp-oauth-server
		claims.name ||
		claims.nickname; // Handle wp-oauth-server
	const email = claims.email;
	let avatarUrl = (claims.picture || claims.avatar_url || claims.photo_url || claims.avatar) // claims.avatar is returned by wp-oauth-server
		?.toString();

	// Handle wp-oauth-server
	if (avatarUrl && avatarUrl.startsWith('secure.gravatar.com%2F')) {
		avatarUrl = 'https://' + decodeURIComponent(avatarUrl);
	}

	if (!username) {
		throw error(400, 'Missing username');
	}

	const session = await collections.sessions.findOne({
		sessionId: locals.sessionId
	});

	const provider = params.slug;
	const ssoInfo = {
		provider,
		id: userId,
		email: email?.toString(),
		avatarUrl: avatarUrl?.toString(),
		name: username.toString()
	};

	if (!session) {
		await collections.sessions.insertOne({
			sessionId: locals.sessionId,
			createdAt: new Date(),
			updatedAt: new Date(),
			_id: new ObjectId(),
			expiresAt: addYears(new Date(), 1),
			sso: [ssoInfo]
		});
	} else {
		await collections.sessions.updateOne(
			{
				sessionId: locals.sessionId
			},
			{
				$set: {
					updatedAt: new Date(),
					expiresAt: addYears(new Date(), 1),
					sso: [...(session.sso || []).filter((s) => s.provider !== ssoInfo.provider), ssoInfo]
				}
			}
		);
	}
	await renewSessionId(locals, cookies);
	locals.sso = [...(session?.sso || []).filter((s) => s.provider !== ssoInfo.provider), ssoInfo];

	throw redirect(302, '/login');
};
