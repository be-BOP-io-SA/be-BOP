import { ZodError } from 'zod';
import { type HandleServerError, type Handle, error, redirect } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import { ObjectId } from 'mongodb';
import { addYears } from 'date-fns';

import '$lib/server/locks';
import { refreshPromise, runtimeConfig } from '$lib/server/runtime-config';
import type { CMSPage } from '$lib/types/CmsPage';
import { POS_ROLE_ID, SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
// import { countryFromIp } from '$lib/server/geoip';

interface Client {
	writer: WritableStreamDefaultWriter;
	userId: string;
}

interface ChangeEvent {
	documentKey: {
		_id?: string;
	};
}

const clients: Record<string, Client> = {};

export function notifyClientsOfCartUpdate(
	data: { eventType: string | undefined },
	userIdToUpdate: string
): void {
	for (const clientId in clients) {
		if (clients[clientId].userId === userIdToUpdate) {
			const writer = clients[clientId].writer;
			writer.write(`data: ${JSON.stringify(data)}\n\n`).catch((error) => {
				console.error(`Error writing to client ${clientId}`, error);
				// Error writing to the client, assume it has disconnected
				writer.close();
				delete clients[clientId];
			});
		}
	}
}

//Check change on cart collection
const cartCollection = collections.carts;
const cartChangeStream = cartCollection.watch();

cartChangeStream.on('change', async (changeEvent: ChangeEvent) => {
	try {
		if (changeEvent?.documentKey?._id) {
			const cart = await collections.carts.findOne({
				_id: new ObjectId(changeEvent.documentKey._id)
			});

			if (!cart || !cart.userId) {
				console.error('Cart or session ID not found for changeEvent: ', changeEvent);
				return;
			}

			notifyClientsOfCartUpdate({ eventType: 'updateCart' }, cart.userId.toString());
		}
	} catch (error) {
		console.error('Error processing changeEvent:', error);
	}
});

//Check change on order collection
const orderCollection = collections.orders;
const orderChangeStream = orderCollection.watch();

orderChangeStream.on('change', async (changeEvent: ChangeEvent) => {
	try {
		if (changeEvent?.documentKey?._id) {
			const order = await collections.orders.findOne({
				_id: changeEvent.documentKey._id
			});

			if (!order || !order.userId) {
				console.error('Cart or session ID not found for changeEvent: ', changeEvent);
				return;
			}

			notifyClientsOfCartUpdate(
				{ eventType: order.lastPaymentStatusNotified },
				order.userId.toString()
			);
		}
	} catch (error) {
		console.error('Error processing changeEvent:', error);
	}
});

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

export const handle = (async ({ event, resolve }) => {
	await refreshPromise;

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
				login: user.login,
				role: user.roleId
			};
		}
	}
	// Protect any routes under /admin
	if (isAdminUrl) {
		if (!event.locals.user) {
			throw redirect(303, '/admin/login');
		}
		if (event.locals.user.role !== SUPER_ADMIN_ROLE_ID && event.locals.user.role !== POS_ROLE_ID) {
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

	if (event.url.pathname === '/sse') {
		const { readable, writable } = new TransformStream();
		const writer = writable.getWriter();
		const response = new Response(readable, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
		const clientId = Date.now();

		//create client object, with the session id
		const client = {
			id: clientId,
			userId: event.url.searchParams.get('userId') ?? '',
			writer: writer
		};

		clients[clientId] = client;

		return response;
	}

	return response;
}) satisfies Handle;
