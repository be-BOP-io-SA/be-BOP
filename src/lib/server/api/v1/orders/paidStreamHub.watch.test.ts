import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { collections } from '$lib/server/database';
import { anonymizeOrderData } from '$lib/server/orders';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import type { Order } from '$lib/types/Order';
import {
	resetPaidOrderStreamHub,
	subscribeToAllOrders,
	subscribeToOrderAnnotations,
	subscribeToPaidOrders
} from './paidStreamHub';

/** Subscribes to the three feeds and records which one announced which order. */
function listenToEveryFeed() {
	const heard: Array<{ feed: 'paid' | 'all' | 'annotations'; orderId: string }> = [];
	const hear = (feed: 'paid' | 'all' | 'annotations') => (order: Order) =>
		heard.push({ feed, orderId: order._id });
	subscribeToPaidOrders(hear('paid'));
	subscribeToAllOrders(hear('all'));
	subscribeToOrderAnnotations(hear('annotations'));
	return heard;
}

describe('the order watch, on a real change stream', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	afterEach(() => {
		resetPaidOrderStreamHub();
	});

	it('announces an anonymized order on the annotations feed only', async () => {
		const order = await insertTestOrder({
			clientIp: '203.0.113.7',
			user: { email: 'buyer@example.com', sessionId: 'session-1' },
			notifications: { paymentStatus: { email: 'buyer@example.com' } }
		});
		const heard = listenToEveryFeed();
		// The watch only sees what is written once the server has opened its cursor.
		await expect
			.poll(async () => {
				await collections.orders.updateOne({ _id: order._id }, { $set: { updatedAt: new Date() } });
				return heard.length;
			})
			.toBeGreaterThan(0);
		await new Promise((resolve) => setTimeout(resolve, 200));
		heard.length = 0;

		await expect(anonymizeOrderData(order._id)).resolves.toBe(true);

		await expect.poll(() => heard.length).toBeGreaterThan(0);
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect(heard).toEqual([{ feed: 'annotations', orderId: order._id }]);
	});
});
