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

		if (ticket?.scanned) {
			throw error(409, 'Ticket already scanned');
		}

		if (!locals.user) {
			throw error(401, 'Unauthorized');
		}

		const scanned = {
			at: new Date(),
			by: {
				_id: locals.user._id,
				login: locals.user.login,
				role: locals.user.roleId
			}
		};

		const res = await collections.tickets.updateOne(
			{
				ticketId: params.ticketId,
				scanned: { $exists: false }
			},
			{
				$set: {
					scanned
				}
			}
		);

		if (res.matchedCount === 0) {
			throw error(409, 'Ticket already scanned');
		}

		throw redirect(303, request.headers.get('referer') || `/ticket/${params.ticketId}`);
	}
};
