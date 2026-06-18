import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const order = await collections.orders.findOne({
		_id: params.id
	});
	if (!order) {
		throw error(404, 'Order not found');
	}

	return new Response(JSON.stringify(order), { headers: { 'Content-Type': 'application/json' } });
};
