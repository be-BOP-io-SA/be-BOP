import { collections } from './database';
import type { Order, OrderPayment, Price } from '$lib/types/Order';

/**
 * Leaves a system note on the order so staff can settle with the buyer, who has paid something
 * while the order is about to expire. The poller sees the same payment every 2s, so the note is
 * written, and logged, once.
 */
export async function recordUnderpayment(
	order: Pick<Order, '_id'>,
	payment: Pick<OrderPayment, '_id' | 'price'>,
	processor: string,
	received: Price
): Promise<void> {
	const content =
		`${processor} reported payment ${payment._id.toHexString()} settled with ${received.amount} ${
			received.currency
		}, ` +
		`short of the ${payment.price.amount} ${payment.price.currency} asked. The payment stays pending and expires unless the rest arrives.`;

	const { modifiedCount } = await collections.orders.updateOne(
		{ _id: order._id, 'notes.content': { $ne: content } },
		{ $push: { notes: { role: null, content, createdAt: new Date() } } }
	);

	if (modifiedCount) {
		console.error(`[payments] ${content}`);
	}
}
