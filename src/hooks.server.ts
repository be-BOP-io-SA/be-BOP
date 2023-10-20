import { ZodError } from 'zod';
import { type HandleServerError, type Handle, error, redirect } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { ObjectId } from 'mongodb';
import { addYears } from 'date-fns';
import { SvelteKitAuth } from '@auth/sveltekit';

import '$lib/server/locks';
import { refreshPromise, runtimeConfig } from '$lib/server/runtime-config';
import type { CMSPage } from '$lib/types/CmsPage';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import Facebook from '@auth/core/providers/facebook';
import Twitter from '@auth/core/providers/twitter';
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
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
// import { countryFromIp } from '$lib/server/geoip';

export const handleError = (({ error, event }) => {
	console.error('handleError', error);
	if (typeof error === 'object' && error) {
		collections.errors
			.insertOne({
				_id: new ObjectId(),
				url: event.url.href,
				method: event.request.method,
				...error
			})
			.catch();
	}

	if (error instanceof ZodError) {
		event.locals.status = 422;
		const formattedError = error.format();

		if (formattedError._errors.length) {
			return { message: formattedError._errors[0], status: 422 };
		}

		return {
			message: Object.entries(formattedError)
				.map(([key, val]) => {
					if (typeof val === 'object' && val && '_errors' in val && Array.isArray(val._errors)) {
						return `${key}: ${val._errors[0]}`;
					}
				})
				.filter(Boolean)
				.join(', '),
			status: 422
		};
	}
}) satisfies HandleServerError;

const handleGlobal: Handle = async ({ event, resolve }) => {
	// event.locals.countryCode = countryFromIp(event.getClientAddress());

	const isAdminUrl =
		(event.url.pathname.startsWith('/admin/') || event.url.pathname === '/admin') &&
		!(event.url.pathname.startsWith('/admin/login/') || event.url.pathname === '/admin/login');

	const cmsPageMaintenanceAvailable = await collections.cmsPages
		.find({
			maintenanceDisplay: true
		})
		.project<Pick<CMSPage, '_id'>>({
			_id: 1
		})
		.toArray();

	const slug = event.url.pathname.split('/')[1] ? event.url.pathname.split('/')[1] : 'home';

	if (
		runtimeConfig.isMaintenance &&
		!isAdminUrl &&
		event.url.pathname !== '/logo' &&
		!event.url.pathname.startsWith('/.well-known/') &&
		!event.url.pathname.startsWith('/picture/raw/') &&
		event.url.pathname !== '/lightning/pay' &&
		!cmsPageMaintenanceAvailable.find((cmsPage) => cmsPage._id === slug) &&
		!runtimeConfig.maintenanceIps.split(',').includes(event.getClientAddress())
	) {
		if (event.request.method !== 'GET') {
			throw error(405, 'Site is in maintenance mode. Please try again later.');
		}
		throw error(503, 'Site is in maintenance mode. Please try again later.');
	}

	const token = event.cookies.get('bootik-session');

	event.locals.sessionId = token || crypto.randomUUID();

	// Refresh cookie expiration date
	event.cookies.set('bootik-session', event.locals.sessionId, {
		path: '/',
		sameSite: 'lax',
		secure: true,
		httpOnly: true,
		expires: addYears(new Date(), 1)
	});
	const session = await collections.sessions.findOne({
		sessionId: event.locals.sessionId
	});
	if (session) {
		const user = await collections.users.findOne({
			_id: session.userId
		});
		if (user) {
			event.locals.user = {
				login: user.login ? user.login : '',
				role: user.roleId
			};
		}
		if (session.email) {
			event.locals.email = session.email;
		}
		if (session.npub) {
			event.locals.npub = session.npub;
		}
	}
	// Protect any routes under /admin
	if (isAdminUrl) {
		if (!event.locals.user) {
			throw redirect(303, '/admin/login');
		}
		if (event.locals.user.role !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'You are not allowed to access this page.');
		}
	}

	const response = await resolve(event);

	if (
		response.status >= 500 &&
		(!event.locals.status || event.locals.status >= 500) &&
		response.headers.get('Content-Type')?.includes('text/html')
	) {
		const errorPages = await collections.cmsPages.countDocuments({
			_id: 'error'
		});

		if (errorPages) {
			return new Response(null, {
				status: 302,
				headers: {
					location: '/error'
				}
			});
		}
	}

	// Work around handleError which does not allow setting the header
	const status = event.locals.status;
	if (status) {
		const contentType = response.headers.get('Content-Type');
		return new Response(response.body, {
			...response,
			headers: {
				...Object.fromEntries(response.headers.entries()),
				'content-type': contentType?.includes('html') ? contentType : 'application/json'
			},
			status
		});
	}
	return response;
};

const authProviders = [
	...(GITHUB_ID && GITHUB_SECRET
		? [GitHub({ clientId: GITHUB_ID, clientSecret: GITHUB_SECRET })]
		: []),
	...(GOOGLE_ID && GOOGLE_SECRET
		? [Google({ clientId: GOOGLE_ID, clientSecret: GOOGLE_SECRET })]
		: []),
	...(FACEBOOK_ID && FACEBOOK_SECRET
		? [Facebook({ clientId: FACEBOOK_ID, clientSecret: FACEBOOK_SECRET })]
		: []),
	...(TWITTER_ID && TWITTER_SECRET
		? [Twitter({ clientId: TWITTER_ID, clientSecret: TWITTER_SECRET })]
		: [])
];

if (!building) {
	await refreshPromise;
}

const handleSSO = authProviders
	? SvelteKitAuth({ providers: authProviders, secret: runtimeConfig.ssoSecret })
	: null;

export const handle = handleSSO ? sequence(handleGlobal, handleSSO) : handleGlobal;
