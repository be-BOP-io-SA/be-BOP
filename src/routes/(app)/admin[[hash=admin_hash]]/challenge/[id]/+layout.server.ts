import { collections } from '$lib/server/database.js';
import { Order } from '$lib/types/Order';
import { Product } from '$lib/types/Product';
import { error } from '@sveltejs/kit';
import { Filter } from 'mongodb';

export async function load({ params }) {
	const challenge = await collections.challenges.findOne({
		_id: params.id
	});

	if (!challenge) {
		throw error(404, 'Challenge not found');
	}

	const beginsAt = challenge.beginsAt;
	const endsAt = challenge.endsAt;
	const products = await collections.products
		.find({})
		.project<Pick<Product, 'name' | '_id'>>({ name: 1 })
		.toArray();
	const query: Filter<Order> = {
		createdAt: {
			$lt: endsAt,
			$gt: beginsAt
		},
		status: 'paid'
	};
	if (challenge.productIds.length > 0) {
		query['items.product._id'] = { $in: [...challenge.productIds] };
	}
	const orders = await collections.orders.find(query).sort({ createdAt: -1 }).toArray();

	return {
		challenge,
		beginsAt,
		endsAt,
		products,
		orders: orders.map((order) => ({
			_id: order._id,
			payments: order.payments.map((payment) => ({
				id: payment._id.toString(),
				status: payment.status,
				method: payment.method
			})),
			number: order.number,
			createdAt: order.createdAt,
			status: order.status,
			notes:
				order.notes?.map((note) => ({
					content: note.content,
					createdAt: note.createdAt
				})) || [],
			currencySnapshot: order.currencySnapshot
		}))
	};
}
