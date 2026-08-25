import { collections } from '$lib/server/database.js';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async function ({ params, locals, request }) {
		const ticket = await collections.tickets.findOne({
			ticketId: params.ticketId
		});

		if (!ticket) {
			throw error(404, 'Ticket not found');
		}

		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		if (!ticket?.scanned) {
			throw redirect(303, request.headers.get('referer') || `/ticket/${params.ticketId}`);
		}

		const descanned = {
			at: new Date(),
			by: {
				_id: locals.user._id,
				login: locals.user.login,
				role: locals.user.roleId
			}
		};

		await collections.tickets.updateOne(
			{
				ticketId: params.ticketId
			},
			{
				$set: {
					descanned
				},
				$unset: {
					scanned: ''
				}
			}
		);

		throw redirect(303, request.headers.get('referer') || `/ticket/${params.ticketId}`);
	}
};
