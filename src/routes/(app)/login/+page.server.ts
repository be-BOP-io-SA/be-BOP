import { z } from 'zod';
import { sendAuthentificationlink } from '$lib/server/sendNotification';
import { jwtVerify } from 'jose';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { fail, redirect } from '@sveltejs/kit';
import { collections } from '$lib/server/database.js';
import { addDays } from 'date-fns';
import {
	FACEBOOK_ID,
	FACEBOOK_SECRET,
	GITHUB_ID,
	GITHUB_SECRET,
	GOOGLE_ID,
	GOOGLE_SECRET,
	TWITTER_ID,
	TWITTER_SECRET
} from '$lib/server/env-config';
import { validateEmailOrNpub } from '$lib/server/nostr.js';
import { renewSessionId } from '$lib/server/user.js';
import { rateLimit } from '$lib/server/rateLimit.js';
import { SESSION_COOKIE_NAME } from '$lib/server/cookies';

// HP-2026-08-12 (Peak Learn) : redirection post-authLink limitée à une
// allowlist stricte (jamais d'URL externe, jamais d'open redirect).
// HP-2026-08-13 (review #2715) : extrait dans une fonction partagée
// (load + validate) au lieu d'être dupliqué.
const SAFE_NEXT = ['/checkout', '/cart', '/orders', '/identity', '/login'];
const CART_NEXT_RE = /^\/cart\?slug=[a-z0-9][a-z0-9-]{0,119}&qty=\d+$/;
function safeNext(next: string | null): string {
	return next && (SAFE_NEXT.includes(next) || CART_NEXT_RE.test(next)) ? next : '/login';
}

export const load = async ({ url }) => {
	const token = url.searchParams.get('token');
	const next = safeNext(url.searchParams.get('next'));

	const base = {
		canSso: {
			github: !!(GITHUB_ID && GITHUB_SECRET),
			google: !!(GOOGLE_ID && GOOGLE_SECRET),
			facebook: !!(FACEBOOK_ID && FACEBOOK_SECRET),
			twitter: !!(TWITTER_ID && TWITTER_SECRET),
			providers: runtimeConfig.oauth
				.filter((o) => o.enabled)
				.map((o) => ({
					name: o.name,
					slug: o.slug
				}))
		},
		next: next
	};

	if (token) {
		try {
			const authLink = await jwtVerify(
				token,
				Uint8Array.from(Buffer.from(runtimeConfig.authLinkJwtSigningKey))
			);

			const { npub, email } = z
				.object({
					npub: z.string().optional(),
					email: z.string().optional()
				})
				.parse(authLink.payload);

			if (npub) {
				return {
					...base,
					npubToLogin: npub
				};
			} else if (email) {
				return {
					...base,
					emailToLogin: email
				};
			}
		} catch (err) {
			return { ...base, error: 'invalidOrExpiredToken' };
		}
	}

	return base;
};

export const actions = {
	sendLink: async function ({ request, locals }) {
		const data = await request.formData();
		const result = validateEmailOrNpub(data.get('address'));
		if ('error' in result) {
			return fail(400, { error: result.error });
		}
		const address = result.address;

		rateLimit(locals.clientIp, 'email', 5, { minutes: 5 });

		await sendAuthentificationlink(address.includes('@') ? { email: address } : { npub: address });
		return { address, successUser: true };
	},
	validate: async function ({ url, locals, cookies }) {
		const token = url.searchParams.get('token');
		const next = safeNext(url.searchParams.get('next'));
		let dontCatch = false;

		if (!token) {
			return fail(400, { error: 'invalidOrExpiredToken' });
		}
		try {
			const authLink = await jwtVerify(
				token,
				Uint8Array.from(Buffer.from(runtimeConfig.authLinkJwtSigningKey))
			);

			const { npub, email, firstName, lastName } = z
				.object({
					npub: z.string().optional(),
					email: z.string().optional(),
					firstName: z.string().trim().max(100).optional(),
					lastName: z.string().trim().max(100).optional()
				})
				.parse(authLink.payload);

			await collections.sessions.updateOne(
				{
					sessionId: locals.sessionId
				},
				{
					$setOnInsert: {
						createdAt: new Date()
					},
					$set: {
						updatedAt: new Date(),
						expiresAt: addDays(new Date(), 1),
						...(npub && { npub }),
						...(email && { email })
					}
				},
				{
					upsert: true
				}
			);

			// HP-2026-08-12 (Peak Learn) : le JWT AuthLink émis par la plateforme
			// peut porter prénom/nom (signés, jamais client). On matérialise un
			// personalInfo rattaché à l'e-mail pour que le checkout be-BOP
			// préremplisse nativement email + prénom + nom (mécanisme natif).
			// HP-2026-08-13 (review #2715) : $set ciblé sur firstName/lastName
			// uniquement — `user: { email }` n'est posé qu'en $setOnInsert pour
			// ne jamais écraser sessionId/userId/npub d'un personalInfo existant.
			if (email && firstName && lastName) {
				await collections.personalInfo.updateOne(
					{ 'user.email': email },
					{
						$set: {
							firstName,
							lastName,
							updatedAt: new Date()
						},
						$setOnInsert: {
							createdAt: new Date(),
							user: { email }
						}
					},
					{ upsert: true }
				);
			}
			await renewSessionId(locals, cookies);

			dontCatch = true;
			throw redirect(303, next);
		} catch (err) {
			if (dontCatch) {
				throw err;
			}
			return fail(400, { error: 'invalidOrExpiredToken' });
		}
	},
	clearEmail: async function ({ locals }) {
		await collections.sessions.updateOne(
			{ sessionId: locals.sessionId },
			{ $unset: { email: '' } }
		);
	},
	clearNpub: async function ({ locals }) {
		await collections.sessions.updateOne({ sessionId: locals.sessionId }, { $unset: { npub: '' } });
	},
	clearUserId: async function ({ locals }) {
		await collections.sessions.updateOne(
			{ sessionId: locals.sessionId },
			{ $unset: { userId: '' } }
		);
	},
	clearSso: async function ({ locals, request }) {
		const { provider } = z
			.object({
				provider: z.enum([
					'github',
					'google',
					'facebook',
					'twitter',
					...runtimeConfig.oauth.filter((o) => o.enabled).map((o) => o.slug),
					...(locals.sso?.map((sso) => sso.provider) ?? [])
				])
			})
			.parse(Object.fromEntries(await request.formData()));

		await collections.sessions.updateOne(
			{ sessionId: locals.sessionId },
			{ $pull: { sso: { provider } } }
		);
	},
	clearAll: async function (event) {
		await collections.sessions.deleteOne({ sessionId: event.locals.sessionId });

		event.locals.sessionId = crypto.randomUUID();
		event.cookies.delete(SESSION_COOKIE_NAME, {
			path: '/'
		});
	}
};
