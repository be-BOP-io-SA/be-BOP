import { collections } from '$lib/server/database';
import type { Order } from '$lib/types/Order';
import { tryScheduleToProductId } from '$lib/types/Schedule';
import { userIdentifier, userQuery } from '$lib/server/user';

const BOOKING_LIST_LIMIT = 500;

export async function load({ locals }) {
	const userQ = userQuery(userIdentifier(locals));

	const orders = await collections.orders
		.find(userQ)
		.project<Pick<Order, '_id' | 'number'>>({ _id: 1, number: 1 })
		.toArray();

	if (!orders.length) {
		return { bookings: [] };
	}

	const orderIds = orders.map((o) => o._id);
	const orderNumberById = new Map(orders.map((o) => [o._id, o.number]));

	const events = await collections.scheduleEvents
		.find({ orderId: { $in: orderIds }, status: { $in: ['confirmed', 'canceled'] } })
		.sort({ beginsAt: -1 })
		.limit(BOOKING_LIST_LIMIT)
		.toArray();

	const productIdByEvent = new Map(
		events.map((e) => [e._id.toString(), tryScheduleToProductId(e.scheduleId)] as const)
	);

	const productIds = [
		...new Set([...productIdByEvent.values()].filter((id): id is string => !!id))
	];

	const products = productIds.length
		? await collections.products
				.find({ _id: { $in: productIds } })
				.project<{ _id: string; name: string }>({
					_id: 1,
					name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] }
				})
				.toArray()
		: [];

	const productNameById = new Map(products.map((p) => [p._id, p.name]));

	return {
		bookings: events.map((e) => {
			const productId = productIdByEvent.get(e._id.toString()) ?? null;
			return {
				_id: e._id.toString(),
				orderId: e.orderId,
				orderNumber: orderNumberById.get(e.orderId) ?? null,
				productId,
				productName: (productId ? productNameById.get(productId) : null) ?? e.title,
				beginsAt: e.beginsAt,
				endsAt: e.endsAt,
				status: e.status
			};
		})
	};
}
