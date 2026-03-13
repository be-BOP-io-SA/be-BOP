import { collections } from '$lib/server/database';
import { pojo } from '$lib/server/pojo';

export const load = async ({ params }) => {
	const scheduleEvents = await collections.scheduleEvents
		.find({
			scheduleId: params.id,
			status: 'confirmed'
		})
		.sort({ beginsAt: -1 })
		.toArray();

	const orderIds = [...new Set(scheduleEvents.map((e) => e.orderId))];
	const orders = await collections.orders
		.find({ _id: { $in: orderIds } })
		.project<{ _id: string; number: number }>({ _id: 1, number: 1 })
		.toArray();
	const orderMap = new Map(orders.map((o) => [o._id, o.number]));

	const bookings = scheduleEvents.map((e) => ({
		...pojo(e),
		orderNumber: orderMap.get(e.orderId)
	}));

	return { bookings };
};
