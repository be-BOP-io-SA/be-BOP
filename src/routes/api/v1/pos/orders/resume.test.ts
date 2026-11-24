import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/database';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import type { AuthenticatedApiKey } from '$lib/types/ApiV1';

const apiKey: AuthenticatedApiKey = {
	_id: new ObjectId(),
	name: 'till',
	scopes: ['pos:read'],
	keyPrefix: 'bebop_ak_test_resume01'
};

// Only the key lookup is replaced: the route, the feed and the database are the real ones.
vi.mock('$lib/server/api/v1/auth', () => ({ requireApiKey: async () => apiKey }));

import { GET } from './+server';

type Page = {
	orders: Array<{ orderId: string }>;
	nextCursor: string | null;
	lastEventId: string | null;
};

async function page(query: string): Promise<Page> {
	const url = `http://localhost/api/v1/pos/orders${query}`;
	const res = await GET({
		request: new Request(url),
		url: new URL(url),
		locals: { apiKey, clientIp: '203.0.113.50' }
	} as unknown as Parameters<typeof GET>[0]);
	expect(res.status).toBe(200);
	return res.json();
}

const at = (minute: number) => new Date(Date.UTC(2026, 7, 1, 10, minute));

describe('GET /api/v1/pos/orders, for a till that lost its link', () => {
	beforeEach(async () => {
		await cleanDb();
		apiKey._id = new ObjectId();
	});

	it('gives the sale paid meanwhile, even when the last one received was written again', async () => {
		const x = await insertTestOrder({ updatedAt: at(0) });
		const first = await page('?since_ts=0&limit=1');
		expect(first.orders.map((order) => order.orderId)).toEqual([x._id]);

		// X was the last sale there was: nothing follows, and the till still gets a resume point.
		expect(first.nextCursor).toBeNull();
		expect(first.lastEventId).toEqual(expect.any(String));

		// The till loses its link. Y is paid, then X is written again.
		const y = await insertTestOrder({ updatedAt: at(1) });
		await collections.orders.updateOne({ _id: x._id }, { $set: { updatedAt: at(2) } });

		// Without a resume point, all a till can send back is the last order id it received.
		const resumeFrom = first.lastEventId ?? x._id;
		const resumed = await page(`?last_event_id=${encodeURIComponent(resumeFrom)}`);

		expect(resumed.orders.map((order) => order.orderId)).toEqual([y._id, x._id]);
	});

	it('gives back the resume point it was sent when nothing was paid since', async () => {
		await insertTestOrder({ updatedAt: at(0) });
		await insertTestOrder({ updatedAt: at(1) });
		const first = await page('?since_ts=0');
		const point = first.lastEventId ?? '';

		const empty = await page(`?last_event_id=${encodeURIComponent(point)}`);
		// A till keeps what the page gives it: it calls again with that, or with nothing at all.
		const again = await page(
			empty.lastEventId ? `?last_event_id=${encodeURIComponent(empty.lastEventId)}` : '?since_ts=0'
		);

		expect({
			lastEventIdAfterEmptyPage: empty.lastEventId,
			replayed: again.orders.length
		}).toEqual({ lastEventIdAfterEmptyPage: point, replayed: 0 });
	});

	it('still resumes after an order id, as a till written before resume points sends it', async () => {
		const x = await insertTestOrder({ updatedAt: at(0) });
		const y = await insertTestOrder({ updatedAt: at(1) });

		const resumed = await page(`?last_event_id=${x._id}`);

		expect(resumed.orders.map((order) => order.orderId)).toEqual([y._id]);
	});

	it('reads a resume point given to another key as unknown, and starts the page over', async () => {
		const x = await insertTestOrder({ updatedAt: at(0) });
		const y = await insertTestOrder({ updatedAt: at(1) });
		const first = await page('?since_ts=0&limit=1');
		// Two sales, one per page: this page has a successor, and says where it starts.
		expect(first.nextCursor).toBe(first.lastEventId);

		apiKey._id = new ObjectId();
		const resumed = await page(`?last_event_id=${encodeURIComponent(first.nextCursor ?? '')}`);

		expect(resumed.orders.map((order) => order.orderId)).toEqual([x._id, y._id]);
	});
});
