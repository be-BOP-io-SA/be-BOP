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
} from '$env/static/private';
import { zodNpub } from '$lib/server/nostr.js';
import { renewSessionId } from '$lib/server/user.js';
import { rateLimit } from '$lib/server/rateLimit.js';

export const load = async ({ url }) => {
	const token = url.searchParams.get('token');

	const base = {
		canSso: {
			github: !!(GITHUB_ID && GITHUB_SECRET),
			google: !!(GOOGLE_ID && GOOGLE_SECRET),
			facebook: !!(FACEBOOK_ID && FACEBOOK_SECRET),
			twitter: !!(TWITTER_ID && TWITTER_SECRET)
		}
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
			return { ...base, error: 'Invalid or expired token' };
		}
	}

	return base;
};

export const actions = {
	sendLink: async function ({ request, locals }) {
		const data = await request.formData();
		const { address } = z
			.object({
				address: z.union([z.string().email(), zodNpub()])
			})
			.parse({
				address: data.get('address')
			});

		rateLimit(locals.clientIp, 'email', 5, { minutes: 5 });

		await sendAuthentificationlink(address.includes('@') ? { email: address } : { npub: address });
		return { address, successUser: true };
	},
	validate: async function ({ url, locals, cookies }) {
		const token = url.searchParams.get('token');
		let dontCatch = false;

		if (!token) {
			return fail(400, { error: 'Invalid or expired token' });
		}
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
			await renewSessionId(locals, cookies);

			dontCatch = true;
			throw redirect(303, '/login');
		} catch (err) {
			if (dontCatch) {
				throw err;
			}
			return fail(400, { error: 'Invalid or expired token' });
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
				provider: z.enum(['github', 'google', 'facebook', 'twitter'])
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
		event.cookies.delete('bootik-session', {
			path: '/'
		});
	}
};
