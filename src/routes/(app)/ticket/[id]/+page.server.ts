import { collections } from '$lib/server/database.js';
import type { Product } from '$lib/types/Product.js';
import { isAllowedOnPage } from '$lib/types/Role.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const ticketId = event.params.id;

	const ticket = await collections.tickets.findOne({ ticketId });

	if (!ticket) {
		throw error(404, 'Ticket not found');
	}

	const product = await collections.products.findOne<Pick<Product, 'name' | '_id'>>(
		{ _id: ticket.productId },
		{
			projection: {
				name: { $ifNull: [`$translations.${event.locals.language}.name`, '$name'] }
			}
		}
	);

	if (!product) {
		throw error(404, 'Event associated to ticket not found');
	}

	const picture = await collections.pictures.findOne(
		{
			productId: ticket.productId
		},
		{
			sort: { createdAt: 1 }
		}
	);

	let canBurn = false;
	let canUnburn = false;
	if (event.locals.user?.role) {
		canBurn = isAllowedOnPage(
			event.locals.user.role,
			`/admin/ticket/${ticket.ticketId}/burn`,
			'write'
		);
		canUnburn = isAllowedOnPage(
			event.locals.user.role,
			`/admin/ticket/${ticket.ticketId}/unburn`,
			'write'
		);
	}

	return {
		ticket: {
			ticketId: ticket.ticketId,
			createdAt: ticket.createdAt,
			scanned: ticket.scanned && {
				at: ticket.scanned.at
			}
		},
		canBurn,
		canUnburn,
		product,
		picture
	};
};
