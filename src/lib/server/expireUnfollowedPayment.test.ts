import { beforeEach, describe, expect, it } from 'vitest';
import { subMinutes } from 'date-fns';
import type { OrderPayment } from '$lib/types/Order';
import { cleanDb, insertTestOrder } from './test-utils';
import { collections } from './database';
import { expireUnfollowedPayment } from './orders';

const overdue = subMinutes(new Date(), 5);

async function pendingOrderWith(payment: Partial<OrderPayment>) {
	return insertTestOrder({
		status: 'pending',
		payments: [{ status: 'pending', paidAt: undefined, expiresAt: overdue, ...payment }]
	});
}

describe('expireUnfollowedPayment', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	// Pending payments with a past deadline that be-BOP has always left for the shop to settle.
	const neverExpired: Array<[string, Partial<OrderPayment>]> = [
		['a bank transfer', { method: 'bank-transfer', processor: 'bank-transfer' }],
		['a custom payment method', { method: 'custom' }],
		['a free payment', { method: 'free' }],
		['a point-of-sale payment', { method: 'point-of-sale' }],
		['a payment without a processor', { method: 'card' }],
		[
			'a payment whose processor is unknown',
			{ method: 'card', processor: 'gone' as OrderPayment['processor'] }
		]
	];

	it.each(neverExpired)('leaves %s as it is, however old its deadline', async (_, payment) => {
		const order = await pendingOrderWith(payment);

		await expect(expireUnfollowedPayment(order, order.payments[0])).resolves.toBeNull();

		const stored = await collections.orders.findOne({ _id: order._id });
		expect(stored?.status).toBe('pending');
		expect(stored?.payments[0].status).toBe('pending');
	});

	it('expires a payment marked for it once its deadline is past', async () => {
		const order = await pendingOrderWith({ method: 'point-of-sale', expireAtDeadline: true });

		const expired = await expireUnfollowedPayment(order, order.payments[0]);

		expect(expired?.status).toBe('expired');
		expect(expired?.payments[0].status).toBe('expired');
	});

	it('leaves a marked payment alone before its deadline', async () => {
		const order = await pendingOrderWith({ method: 'point-of-sale', expireAtDeadline: true });

		await expect(
			expireUnfollowedPayment(order, order.payments[0], subMinutes(overdue, 1))
		).resolves.toBeNull();
	});
});
