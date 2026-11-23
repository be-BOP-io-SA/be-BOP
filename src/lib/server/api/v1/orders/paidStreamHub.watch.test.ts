import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoServerError } from 'mongodb';
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

/** A watch the test drives by hand: it records how it was opened and fails on demand. */
function stubWatch() {
	const opened: Array<{ resumeAfter?: unknown }> = [];
	const streams: EventEmitter[] = [];
	vi.spyOn(collections.orders, 'watch').mockImplementation(((_pipeline: unknown, options = {}) => {
		opened.push(options as { resumeAfter?: unknown });
		const stream = Object.assign(new EventEmitter(), { close: async () => undefined });
		streams.push(stream);
		return stream;
	}) as unknown as typeof collections.orders.watch);
	return { opened, latest: () => streams[streams.length - 1] };
}

describe('the order watch, when it fails', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
	});

	afterEach(() => {
		resetPaidOrderStreamHub();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('reopens from the last event it saw after an ordinary failure', () => {
		const watch = stubWatch();
		subscribeToAllOrders(() => undefined);
		watch.latest().emit('change', { _id: { _data: 'token-1' }, operationType: 'insert' });

		watch.latest().emit('error', new Error('connection reset'));
		vi.advanceTimersByTime(1_000);

		expect(watch.opened).toHaveLength(2);
		expect(watch.opened[1].resumeAfter).toEqual({ _data: 'token-1' });
	});

	it.each(['ChangeStreamHistoryLost', 'ChangeStreamFatalError'])(
		'reopens at the live edge once the server answers %s',
		(codeName) => {
			const watch = stubWatch();
			subscribeToAllOrders(() => undefined);
			watch.latest().emit('change', { _id: { _data: 'token-1' }, operationType: 'insert' });

			watch.latest().emit('error', new MongoServerError({ codeName, message: codeName }));
			vi.advanceTimersByTime(1_000);

			expect(watch.opened).toHaveLength(2);
			expect(watch.opened[1].resumeAfter).toBeUndefined();
		}
	);
});

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
