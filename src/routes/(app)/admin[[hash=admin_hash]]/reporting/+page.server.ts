import { collections } from '$lib/server/database';
import { countryFromIp } from '$lib/server/geoip';
import { sum } from '$lib/utils/sum';
import { pojo } from '$lib/server/pojo.js';
import { addDays, subDays, subMonths } from 'date-fns';
import { z } from 'zod';

export async function load({ url }) {
	const querySchema = z.object({
		beginsAt: z.date({ coerce: true }).default(subMonths(new Date(), 1)),
		endsAt: z.date({ coerce: true }).default(new Date())
	});
	const queryParams = Object.fromEntries(url.searchParams.entries());
	const result = querySchema.parse(queryParams);
	const { beginsAt, endsAt } = result;

	const orders = await collections.orders
		.find({
			createdAt: {
				// Expand the search window a bit so that timezone differences between the client and the server do not impact the user's experience
				$gte: subDays(beginsAt, 1),
				$lt: addDays(endsAt, 1)
			}
		})
		.sort({ createdAt: -1 })
		.toArray();
	return {
		orders: orders.map((order) => ({
			_id: order._id,
			payments: order.payments.map((payment) => ({
				...pojo(payment),
				id: payment._id.toString()
			})),
			number: order.number,
			createdAt: order.createdAt,
			currencySnapshot: order.currencySnapshot,
			status: order.status,
			items: order.items.map((item) => ({
				...item,
				product: {
					...item.product,
					vatProfileId: item.product.vatProfileId?.toString()
				}
			})),
			quantityOrder: sum(order.items.map((items) => items.quantity)),
			billingAddress: order.billingAddress,
			shippingAddress: order.shippingAddress,
			ipCountry: countryFromIp(order.clientIp ?? '')
		})),
		beginsAt,
		endsAt
	};
}
