import { beforeEach, describe, expect, it } from 'vitest';
import { subHours } from 'date-fns';
import { iteratePaidOrderBacklog } from '$lib/server/api/v1/orders/paidStream';
import { collections } from '$lib/server/database';
import { onOrderPaymentFailed } from '$lib/server/orders';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import { actions as adminActions } from '../../admin[[hash=admin_hash]]/order/[id]/+page.server';
import { actions as customerActions } from './+page.server';

async function pendingOrderFromAnHourAgo(opts?: { withPendingPayment: boolean }) {
	const anHourAgo = subHours(new Date(), 1);
	return insertTestOrder({
		status: 'pending',
		payments: opts?.withPendingPayment ? [{ status: 'pending', paidAt: undefined }] : [],
		createdAt: anHourAgo,
		updatedAt: anHourAgo
	});
}

/** What a device following every order gets when it resumes from `since`. */
async function resumedOrderIds(since: Date) {
	const ids: string[] = [];
	for await (const frame of iteratePaidOrderBacklog({ since, after: null, feed: 'all' })) {
		ids.push(frame.order._id);
	}
	return ids;
}

function cancelEvent(orderId: string) {
	return { params: { id: orderId }, request: new Request('http://localhost/') } as never;
}

describe('an order that is cancelled or expires, for a stream that resumes', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('is replayed after the shop cancels it', async () => {
		const order = await pendingOrderFromAnHourAgo();
		const beforeCancel = new Date();

		await expect(adminActions.cancel(cancelEvent(order._id))).rejects.toMatchObject({
			status: 303
		});

		expect((await collections.orders.findOne({ _id: order._id }))?.status).toBe('canceled');
		await expect(resumedOrderIds(beforeCancel)).resolves.toEqual([order._id]);
	});

	it('is replayed after the customer cancels it while a payment was awaited', async () => {
		const order = await pendingOrderFromAnHourAgo({ withPendingPayment: true });
		const beforeCancel = new Date();

		await expect(customerActions.cancel(cancelEvent(order._id))).rejects.toMatchObject({
			status: 303
		});

		expect((await collections.orders.findOne({ _id: order._id }))?.status).toBe('canceled');
		await expect(resumedOrderIds(beforeCancel)).resolves.toEqual([order._id]);
	});

	it('is replayed after its payment expires', async () => {
		const order = await pendingOrderFromAnHourAgo({ withPendingPayment: true });
		const beforeExpiry = new Date();

		await onOrderPaymentFailed(order, order.payments[0], 'expired');

		expect((await collections.orders.findOne({ _id: order._id }))?.status).toBe('expired');
		await expect(resumedOrderIds(beforeExpiry)).resolves.toEqual([order._id]);
	});

	it('is replayed after the customer cancels it before any payment', async () => {
		const order = await pendingOrderFromAnHourAgo();
		const beforeCancel = new Date();

		await expect(customerActions.cancel(cancelEvent(order._id))).rejects.toMatchObject({
			status: 303
		});

		expect((await collections.orders.findOne({ _id: order._id }))?.status).toBe('canceled');
		await expect(resumedOrderIds(beforeCancel)).resolves.toEqual([order._id]);
	});
});
