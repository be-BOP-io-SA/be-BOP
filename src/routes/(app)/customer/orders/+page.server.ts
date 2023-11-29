import { collections } from '$lib/server/database';

export async function load(event) {
	const orders = await collections.orders
		.find({ 'user.sessionId': event.locals.sessionId })
		.limit(100)
		.sort({ createdAt: -1 })
		.toArray();

	return {
		orders: orders.map((order) => ({
			_id: order._id,
			payment: order.payment,
			totalPrice: order.totalPrice,
			number: order.number,
			createdAt: order.createdAt,
			totalReceived: order.totalReceived,
			amountsInOtherCurrencies: order.amountsInOtherCurrencies
		}))
	};
}
