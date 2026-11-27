import { beforeEach, describe, expect, it } from 'vitest';
import { collections } from '$lib/server/database';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import type { Order } from '$lib/types/Order';
import { BACKFILL_BATCH, iteratePaidOrderBacklog, orderStreamCursor } from './paidStream';

async function replayedIds(opts: Parameters<typeof iteratePaidOrderBacklog>[0]) {
	const ids: string[] = [];
	for await (const frame of iteratePaidOrderBacklog(opts)) {
		ids.push(frame.order._id);
	}
	return ids;
}

describe('iteratePaidOrderBacklog, on a real database', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('replays every order sharing one millisecond, past a full batch', async () => {
		const template = await insertTestOrder();
		await collections.orders.deleteOne({ _id: template._id });
		const sameInstant = new Date('2026-08-01T10:00:00.000Z');
		const orders: Order[] = Array.from({ length: BACKFILL_BATCH * 2 + 50 }, (_, index) => ({
			...template,
			_id: `order-${String(index).padStart(4, '0')}`,
			number: index + 1,
			updatedAt: sameInstant,
			annotatedAt: sameInstant
		}));
		await collections.orders.insertMany(orders);

		const after = orderStreamCursor(orders[9]);
		const expected = orders.slice(10).map((order) => order._id);

		await expect(replayedIds({ since: null, after })).resolves.toEqual(expected);
		await expect(
			replayedIds({
				since: null,
				after: orderStreamCursor(orders[9], 'annotations'),
				feed: 'annotations'
			})
		).resolves.toEqual(expected);
	});

	it('replays nothing twice across batches of distinct dates', async () => {
		const template = await insertTestOrder();
		await collections.orders.deleteOne({ _id: template._id });
		const start = new Date('2026-08-01T10:00:00.000Z').getTime();
		const orders: Order[] = Array.from({ length: BACKFILL_BATCH + 20 }, (_, index) => ({
			...template,
			_id: `order-${String(index).padStart(4, '0')}`,
			number: index + 1,
			updatedAt: new Date(start + index)
		}));
		await collections.orders.insertMany(orders);

		await expect(replayedIds({ since: new Date(start + 5), after: null })).resolves.toEqual(
			orders.slice(5).map((order) => order._id)
		);
	});
});
