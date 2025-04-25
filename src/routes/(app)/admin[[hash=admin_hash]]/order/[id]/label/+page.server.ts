import { adminPrefix } from '$lib/server/admin';
import { collections } from '$lib/server/database';
import type { OrderLabel } from '$lib/types/OrderLabel';
import { error, redirect } from '@sveltejs/kit';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

export const load = async ({ params }) => {
	const labels = await collections.labels
		.find({})
		.project<Pick<OrderLabel, '_id' | 'name'>>({ _id: 1, name: 1 })
		.toArray();
	const order = await collections.orders.findOne({
		_id: params.id
	});

	if (!order) {
		throw error(404, 'Order not found');
	}
	return {
		labels,
		orderLabelIds: order.orderLabelIds
	};
};
export const actions = {
	default: async function ({ request, params }) {
		const order = await collections.orders.findOne({ _id: params.id });
		if (!order) {
			throw new Error('Order not found');
		}

		const formData = await request.formData();
		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}
		const result = z
			.object({
				orderLabelIds: z.string().array().optional()
			})
			.parse(json);
		await collections.orders.updateOne(
			{
				_id: params.id
			},
			{
				$set: {
					...(result.orderLabelIds !== undefined && { orderLabelIds: result.orderLabelIds }),
					updatedAt: new Date()
				},
				$unset: {
					...(result.orderLabelIds === undefined && { orderLabelIds: '' })
				}
			}
		);

		throw redirect(303, `${adminPrefix()}/order`);
	}
};
