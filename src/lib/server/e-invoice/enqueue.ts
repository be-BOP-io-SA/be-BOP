import { ObjectId, type ClientSession } from 'mongodb';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import type { Order, OrderPayment } from '$lib/types/Order';

/**
 * Insert the slim pending e-invoice document. Called from onOrderPayment
 * INSIDE the payment transaction so the doc exists iff the payment commit
 * succeeds; the e-invoice worker picks it up (change stream + sweep) and
 * enriches it with the generated data + artifacts.
 *
 * The unique index on invoiceNumber dedups transaction retries.
 */
export async function createPendingEInvoice(
	order: Order,
	payment: OrderPayment,
	invoiceNumber: number,
	session: ClientSession,
	lineCategory?: 'goods' | 'services'
): Promise<void> {
	const now = new Date();
	await collections.eInvoices.insertOne(
		{
			_id: new ObjectId(),
			orderId: order._id,
			orderNumber: order.number,
			paymentId: payment._id.toString(),
			invoiceNumber,
			...(lineCategory && { lineCategory }),
			country: runtimeConfig.eInvoicing.country,
			format: 'factur-x',
			generation: {
				status: 'pending',
				attempts: 0,
				nextAttemptAt: now
			},
			transmission: {
				platform: runtimeConfig.eInvoicing.platform,
				status: 'none'
			},
			statusHistory: [{ at: now, kind: 'generation', status: 'pending' }],
			createdAt: now,
			updatedAt: now
		},
		{ session }
	);
}
