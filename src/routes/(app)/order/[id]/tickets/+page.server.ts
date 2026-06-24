import { collections } from '$lib/server/database.js';
import { picturesForProducts } from '$lib/server/picture.js';
import type { Product } from '$lib/types/Product.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const tickets = await collections.tickets
		.find({ orderId: params.id }, { sort: { _id: 1 } })
		.toArray();

	if (!tickets.length) {
		throw error(404, 'No tickets found');
	}

	const products = await collections.products
		.find({ _id: { $in: tickets.map((ticket) => ticket.productId) } })
		.project<Pick<Product, 'name' | '_id'>>({
			name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] }
		})
		.toArray();

	const pictures = await picturesForProducts(tickets.map((ticket) => ticket.productId));

	return {
		tickets: tickets.map((ticket) => ({
			ticketId: ticket.ticketId,
			productId: ticket.productId,
			createdAt: ticket.createdAt,
			scanned: ticket.scanned && {
				at: ticket.scanned.at
			}
		})),
		pictures,
		products
	};
};
