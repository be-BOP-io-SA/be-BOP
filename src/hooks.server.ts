import { ZodError } from 'zod';
import { type HandleServerError, type Handle, error, redirect } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { ObjectId } from 'mongodb';
import { addYears } from 'date-fns';
import { SvelteKitAuth } from '@auth/sveltekit';
import { flatten } from 'flat';
import { adminPrefix as _adminPrefix } from '$lib/server/admin';
import '$lib/server/locks';
import { refreshPromise, runtimeConfig } from '$lib/server/runtime-config';
import type { CMSPage } from '$lib/types/CmsPage';
import { CUSTOMER_ROLE_ID, POS_ROLE_ID } from '$lib/types/User';
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
	LINK_PRELOAD_HEADERS,
	ORIGIN,
	TWITTER_ID,
	TWITTER_SECRET
} from '$env/static/private';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { sha256 } from '$lib/utils/sha256';
import { countryFromIp } from '$lib/server/geoip';
import { isAllowedOnPage } from '$lib/types/Role';
import {
	enhancedLanguages,
	formatDistanceLocale,
	locales,
	type LanguageKey
} from '$lib/translations';
import { addTranslations } from '$lib/i18n';
import { filterNullish } from '$lib/utils/fillterNullish';
import { refreshSessionCookie } from '$lib/server/cookies';
import { renewSessionId } from '$lib/server/user';
import { typedInclude } from '$lib/utils/typedIncludes';
import { rateLimit } from '$lib/server/rateLimit';
import { toIPv4Maybe } from '$lib/server/utils/toIPv4Maybe';

const SSO_COOKIE = 'next-auth.session-token';

for (const key of locales) {
	addTranslations(key, enhancedLanguages[key], {
		formatDistance: formatDistanceLocale[key]
	});
}

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

		const message = Object.entries(
			flatten(formattedError, { safe: true }) as Record<string, string[]>
		)
			.filter(
				(entry: [string, unknown]): entry is [string, string[]] =>
					!!(entry[0].endsWith('._errors') && Array.isArray(entry[1]) && entry[1].length)
			)
			.map(([key, val]) => `${key.slice(0, -'._errors'.length)}: ${val[0]}`)
			.join(', ');

		return {
			message,
			status: 422
		};
	}
}) satisfies HandleServerError;

const addSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);

	response.headers.set('X-Content-Type-Options', 'nosniff');
	// SAMEORIGIN for invoice generation
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');

	// Possible to enable CSP / XSS Protection directly in SvelteKit config

	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	response.headers.set('Feature-Policy', 'camera none; microphone none; geolocation none');
	response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

	// Sveltekit sends huge link headers, which can break w/ nginx unless setting "proxy_buffer_size   16k;"
	if (LINK_PRELOAD_HEADERS !== 'true' && LINK_PRELOAD_HEADERS !== '1') {
		response.headers.delete('Link');
	}

	return response;
};

const handleGlobal: Handle = async ({ event, resolve }) => {
	try {
		event.locals.clientIp = toIPv4Maybe(event.getClientAddress());
	} catch {}
	event.locals.countryCode = event.locals.clientIp
		? countryFromIp(event.locals.clientIp)
		: undefined;

	const adminPrefix = _adminPrefix();

	const isAdminLoginLogoutUrl = /^\/admin(-.+?)?\/(login|logout)(\/|$)/.test(event.url.pathname);

	const method = event.request.method.toLowerCase();

	if (method === 'post' || method === 'put' || method === 'patch' || method === 'delete') {
		rateLimit(event.locals.clientIp, 'method.' + method, 30, { minutes: 1 });
	}

	const adminPath = /^(\/admin(-.+?)?)(\/|$)/.exec(event.url.pathname);
	const isAdminUrl = !!adminPath;

	const slug = event.url.pathname.split('/')[1] ? event.url.pathname.split('/')[1] : 'home';

	// Prioritize lang in URL, then in cookie, then in accept-language header, then default to en
	const acceptLanguages = filterNullish([
		event.url.searchParams.get('lang'),
		event.cookies.get('lang'),
		...(event.request.headers
			.get('accept-language')
			?.split(',')
			?.map((lang) => lang.slice(0, 2)) ?? []),
		runtimeConfig.defaultLanguage
	]);
	event.locals.language = (acceptLanguages.find((l) => typedInclude(runtimeConfig.languages, l)) ||
		runtimeConfig.defaultLanguage) as LanguageKey;

	if (runtimeConfig.isMaintenance) {
		const cmsPageMaintenanceAvailable = await collections.cmsPages
			.find({
				maintenanceDisplay: true
			})
			.project<Pick<CMSPage, '_id'>>({
				_id: 1
			})
			.toArray();
		if (
			!isAdminUrl &&
			event.url.pathname !== '/logo' &&
			!event.url.pathname.startsWith('/.well-known/') &&
			!event.url.pathname.startsWith('/picture/raw/') &&
			event.url.pathname !== '/lightning/pay' &&
			event.url.pathname !== '/maintenance' &&
			event.url.pathname !== '/style/variables.css' &&
			!event.url.pathname.startsWith('/script/language/') &&
			!cmsPageMaintenanceAvailable.find((cmsPage) => cmsPage._id === slug) &&
			!typedInclude(runtimeConfig.maintenanceIps.split(','), event.locals.clientIp)
		) {
			if (event.request.method !== 'GET') {
				throw error(405, 'Site is in maintenance mode. Please try again later.');
			}
			throw redirect(303, '/maintenance');
		}
	}

	const token = event.cookies.get('bootik-session');

	const secretSessionId = token || crypto.randomUUID();
	event.locals.sessionId = await sha256(secretSessionId);
	refreshSessionCookie(event.cookies, secretSessionId);
	const session = (
		await collections.sessions.findOneAndUpdate(
			{
				sessionId: event.locals.sessionId
			},
			{
				$set: {
					updatedAt: new Date(),
					expiresAt: addYears(new Date(), 1)
				}
			}
		)
	).value;
	if (session) {
		if (session.userId) {
			const user = await collections.users.findOne({
				_id: session.userId,
				disabled: { $ne: true }
			});
			if ((session.expireUserAt && session.expireUserAt < new Date()) || !user) {
				await collections.sessions.updateOne(
					{
						sessionId: event.locals.sessionId
					},
					{
						$unset: {
							userId: '',
							expireUserAt: ''
						}
					}
				);
			} else {
				if (user) {
					event.locals.user = {
						_id: user._id,
						login: user.login ? user.login : '',
						roleId: user.roleId,
						alias: user.alias
					};
				}
			}
		}
		event.locals.email = session.email;
		event.locals.npub = session.npub;
		event.locals.sso = session.sso;
		event.locals.acceptAgeLimitation = session.acceptAgeLimitation;
		if (session.pos?.countryCodeOverwrite) {
			event.locals.countryCode = session.pos.countryCodeOverwrite;
		}
	}
	if (adminPath && adminPath[1] !== adminPrefix) {
		if (!event.locals.user || event.locals.user.roleId === CUSTOMER_ROLE_ID) {
			throw error(403, 'Wrong admin prefix. Make sure to type the correct admin URL.');
		}
		return new Response(null, {
			status: 307,
			headers: {
				location: event.url.href.replace(adminPath[1], adminPrefix)
			}
		});
	}

	if (event.locals.user) {
		const role = await collections.roles.findOne({
			_id: event.locals.user.roleId
		});

		if (role) {
			event.locals.user.role = role;
		}
	}

	// Protect any routes under /admin
	if (isAdminUrl && !isAdminLoginLogoutUrl) {
		if (!event.locals.user) {
			throw redirect(303, `${adminPrefix}/login`);
		}

		if (event.locals.user.roleId === CUSTOMER_ROLE_ID) {
			throw error(403, 'You are not allowed to access this page.');
		}

		if (!event.locals.user.role) {
			throw error(403, 'Your role does not exist in DB.');
		}

		if (
			!isAllowedOnPage(
				event.locals.user.role,
				event.url.pathname,
				['get', 'head', 'options'].includes(method) ? 'read' : 'write'
			)
		) {
			if (method === 'get' || method === 'head') {
				throw redirect(307, '/admin');
			}

			throw error(403, 'You are not allowed to access this page.');
		}
	}

	if (event.url.pathname.startsWith('/pos/') || event.url.pathname === '/pos') {
		if (!event.locals.user) {
			throw redirect(303, '/admin/login');
		}

		if (event.locals.user.roleId !== POS_ROLE_ID) {
			throw error(403, 'You are not allowed to access this page, only point-of-sale accounts are.');
		}
	}

	let transformed = false;
	const response = await resolve(event, {
		transformPageChunk: ({ html }) => {
			if (!transformed) {
				transformed = true;
				const darkDefaultTheme =
					isAdminUrl && !isAdminLoginLogoutUrl
						? runtimeConfig.employeesDarkDefaultTheme
						: runtimeConfig.usersDarkDefaultTheme;
				return html.replace(
					'<html',
					`<html lang="${event.locals.language}" class="${darkDefaultTheme ? 'dark' : ''}"`
				);
			}
			return html;
		}
	});

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

const handleSsoCookie: Handle = async ({ event, resolve }) => {
	const ssoSession = await event.locals.getSession();
	if (ssoSession?.user?.name && 'id' in ssoSession.user && typeof ssoSession.user.id === 'string') {
		event.cookies.delete(SSO_COOKIE, { path: '/' });

		const session = await collections.sessions.findOne({
			sessionId: event.locals.sessionId
		});

		const provider = ssoSession.user.id.split('-')[0];
		const ssoInfo = {
			provider,
			id: ssoSession.user.id,
			email: ssoSession.user.email ?? undefined,
			avatarUrl: ssoSession.user.image ?? undefined,
			name: ssoSession.user.name
		};

		if (!session) {
			await collections.sessions.insertOne({
				sessionId: event.locals.sessionId,
				createdAt: new Date(),
				updatedAt: new Date(),
				_id: new ObjectId(),
				expiresAt: addYears(new Date(), 1),
				sso: [ssoInfo]
			});
		} else {
			await collections.sessions.updateOne(
				{
					sessionId: event.locals.sessionId
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
		await renewSessionId(event.locals, event.cookies);
		event.locals.sso = [
			...(session?.sso || []).filter((s) => s.provider !== ssoInfo.provider),
			ssoInfo
		];
	}

	const response = await resolve(event);

	return response;
};

const authProviders = [
	...(GITHUB_ID && GITHUB_SECRET
		? [
				GitHub({
					clientId: GITHUB_ID,
					clientSecret: GITHUB_SECRET,
					profile: (param) => {
						return {
							id: 'github-' + param.id.toString(),
							name: param.name,
							image: param.avatar_url,
							email: param.email
						};
					}
				})
		  ]
		: []),
	...(GOOGLE_ID && GOOGLE_SECRET
		? [
				Google({
					clientId: GOOGLE_ID,
					clientSecret: GOOGLE_SECRET,
					profile: (param) => ({
						name: param.name,
						email: param.email,
						image: param.picture,
						id: 'google-' + param.sub
					})
				})
		  ]
		: []),
	...(FACEBOOK_ID && FACEBOOK_SECRET
		? [
				Facebook({
					clientId: FACEBOOK_ID,
					clientSecret: FACEBOOK_SECRET,
					profile: (param) => ({
						id: 'facebook-' + param.id,
						name: param.name,
						email: param.email,
						image: param.picture.data.url
					})
				})
		  ]
		: []),
	...(TWITTER_ID && TWITTER_SECRET
		? [
				Twitter({
					clientId: TWITTER_ID,
					clientSecret: TWITTER_SECRET,
					profile: (param) => ({
						id: 'twitter-' + param.data.id,
						name: param.data.name,
						email: param.data.email,
						image: param.data.profile_image_url
					})
				})
		  ]
		: [])
];

if (!building) {
	await refreshPromise;
}

const handleSSO = authProviders
	? SvelteKitAuth({
			// Should be fine as long as your reverse proxy is configured to only accept traffic with the correct host header
			trustHost: true,
			providers: authProviders,
			secret: runtimeConfig.ssoSecret,
			/**
			 * Ideally we'd not store in the cookie at all, updating the session in DB directly.
			 *
			 * But I'm not sure it's possible to do that with @auth/sveltekit. So instead, we allow the
			 * cookie to be set, and read its data with `getSession()` and update the session in DB and unset the cookie immediately after.
			 */
			cookies: {
				sessionToken: {
					name: 'next-auth.session-token',
					options: {
						httpOnly: true,
						secure: ORIGIN.startsWith('https://'),
						sameSite: 'lax',
						path: '/'
					}
				}
			},
			callbacks: {
				/**
				 * Get the user's ID from the token and add it to the session
				 */
				session: async (params) => {
					if (params.session.user) {
						Object.assign(params.session.user, {
							id: params.token.sub
						});
					}
					return params.session;
				}
			}
	  })
	: null;

export const handle = handleSSO
	? sequence(addSecurityHeaders, handleGlobal, handleSSO, handleSsoCookie)
	: sequence(addSecurityHeaders, handleGlobal);
