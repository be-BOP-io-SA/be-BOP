import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventSource } from 'undici';
import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/database';
import { cleanDb, insertTestOrder } from '$lib/server/test-utils';
import { apiError } from '$lib/server/api/v1/errors';
import { addOrderLabel } from '$lib/server/api/v1/orders/addLabel';
import { addOrderNote } from '$lib/server/api/v1/orders/addNote';
import { closeAllStreams } from '$lib/server/api/v1/orders/paidStreamConnection';
import { resetPaidOrderStreamHub } from '$lib/server/api/v1/orders/paidStreamHub';
import {
	encodeStreamCursor,
	parseStreamCursor,
	type StreamCursorScope
} from '$lib/server/api/v1/orders/paidStream';
import type { ApiV1Scope } from '$lib/types/ApiV1';

vi.mock('$lib/server/api/v1/auth', () => ({
	requireApiKey: (event: { locals: { apiKey?: { scopes: ApiV1Scope[] } } }): unknown =>
		event.locals.apiKey?.scopes.includes('orders:stream')
			? event.locals.apiKey
			: apiError(403, 'FORBIDDEN', 'API key lacks required scope: orders:stream')
}));
vi.mock('$lib/server/rateLimit', () => ({ checkRateLimit: () => ({ limited: false }) }));

import { GET as annotationsStream } from './+server';
import { GET as salesStream } from '../../paid/stream/+server';
import { GET as ordersStream } from '../../stream/+server';

type Handler = typeof annotationsStream;

function makeKey(opts: { scopes?: ApiV1Scope[]; ownOrdersOnly?: boolean } = {}) {
	return {
		_id: new ObjectId(),
		name: 'Till',
		scopes: opts.scopes ?? (['orders:stream'] as ApiV1Scope[]),
		keyPrefix: 'bebop_ak_test_abcd1234',
		maxConcurrentStreams: 20,
		...(opts.ownOrdersOnly && { ownOrdersOnly: true })
	};
}
type Key = ReturnType<typeof makeKey>;

const scopeOf = (key: Key, feed: StreamCursorScope['feed']): StreamCursorScope => ({
	keyId: key._id.toString(),
	feed
});

const openConnections: AbortController[] = [];

async function connect(handler: Handler, key: Key, lastEventId?: string): Promise<Response> {
	const controller = new AbortController();
	openConnections.push(controller);
	const url = 'http://localhost/api/v1/orders/stream';
	const headers = new Headers(lastEventId ? { 'last-event-id': lastEventId } : {});
	return await handler({
		request: new Request(url, { headers, signal: controller.signal }),
		url: new URL(url),
		params: {},
		locals: { apiKey: key }
	} as unknown as Parameters<Handler>[0]);
}

type Frame = { id?: string; event?: string; data?: Record<string, unknown> };

/** One reader over one response: frames keep coming in order, and silence is answered `null`. */
class FrameReader {
	private buffer = '';
	private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
	private readonly decoder = new TextDecoder();

	constructor(res: Response) {
		if (!res.body) {
			throw new Error('stream response has no body');
		}
		this.reader = res.body.getReader();
	}

	async next(quietMs = 400): Promise<Frame | null> {
		for (;;) {
			const end = this.buffer.indexOf('\n\n');
			if (end >= 0) {
				const raw = this.buffer.slice(0, end);
				this.buffer = this.buffer.slice(end + 2);
				const frame = parseFrame(raw);
				if (frame) {
					return frame;
				}
				continue;
			}
			const chunk = await Promise.race([
				this.reader.read(),
				new Promise<{ done: true; value: undefined }>((resolve) =>
					setTimeout(() => resolve({ done: true, value: undefined }), quietMs)
				)
			]);
			if (chunk.done) {
				return null;
			}
			this.buffer += this.decoder.decode(chunk.value, { stream: true });
		}
	}

	async drain(quietMs = 400): Promise<Frame[]> {
		const frames: Frame[] = [];
		for (let frame = await this.next(quietMs); frame; frame = await this.next(quietMs)) {
			frames.push(frame);
		}
		return frames;
	}
}

/** Comments (`:ok`, heartbeats) and `retry:` hints are framing, not frames. */
function parseFrame(raw: string): Frame | null {
	const frame: Frame = {};
	for (const line of raw.split('\n')) {
		if (line.startsWith('id: ')) {
			frame.id = line.slice(4);
		} else if (line.startsWith('event: ')) {
			frame.event = line.slice(7);
		} else if (line.startsWith('data: ')) {
			frame.data = JSON.parse(line.slice(6));
		}
	}
	return frame.id || frame.event || frame.data ? frame : null;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** The first frame of a stream opened at the live edge: an id with no event. */
async function openingIdOf(reader: FrameReader): Promise<string> {
	const frame = await reader.next();
	expect(frame).toEqual({ id: expect.any(String) });
	return frame?.id as string;
}

async function annotatedOrder(key?: Key) {
	return insertTestOrder(key ? { externalSourceApiKeyId: key._id } : {});
}

beforeEach(async () => {
	await cleanDb();
});

afterEach(() => {
	closeAllStreams();
	for (const controller of openConnections.splice(0)) {
		controller.abort();
	}
	resetPaidOrderStreamHub();
});

describe('GET /api/v1/orders/updates/stream: who may open it', () => {
	it('requires the orders:stream right', async () => {
		const res = await connect(annotationsStream, makeKey({ scopes: ['orders:read'] }));
		expect(res.status).toBe(403);
	});

	it.each([
		[
			'an id of the paid stream',
			(key: Key) => encodeStreamCursor({ ms: 1, orderId: 'a' }, scopeOf(key, 'paid'))
		],
		[
			'an id of the all-orders stream',
			(key: Key) => encodeStreamCursor({ ms: 1, orderId: 'a' }, scopeOf(key, 'all'))
		],
		[
			'an id of another key',
			() => encodeStreamCursor({ ms: 1, orderId: 'a' }, scopeOf(makeKey(), 'annotations'))
		],
		['an id nobody issued', () => 'not-a-cursor']
	])('refuses %s', async (_name, lastEventId) => {
		const key = makeKey();
		const res = await connect(annotationsStream, key, lastEventId(key));
		expect(res.status).toBe(400);
	});

	it('answers a key only about the orders it wrote when the key is limited to them', async () => {
		const key = makeKey({ ownOrdersOnly: true });
		const mine = await annotatedOrder(key);
		const others = await annotatedOrder();
		const opening = await openingIdOf(new FrameReader(await connect(annotationsStream, key)));
		await pause(5);

		await addOrderNote({ orderId: others._id, content: 'not yours', keyName: 'Other' });
		await addOrderNote({ orderId: mine._id, content: 'yours', keyName: 'Till' });

		const reader = new FrameReader(await connect(annotationsStream, key, opening));
		const frames = await reader.drain();
		expect(frames.map((frame) => frame.data?.orderId)).toEqual([mine._id]);
	});
});

describe('GET /api/v1/orders/updates/stream: what it carries', () => {
	it('gives the label its name and the order the date of its last annotation', async () => {
		const key = makeKey();
		const order = await annotatedOrder();
		const opening = await openingIdOf(new FrameReader(await connect(annotationsStream, key)));
		await pause(5);

		await addOrderLabel({ orderId: order._id, labelId: 'vip', label: { name: 'VIP client' } });
		const { annotatedAt } = (await collections.orders.findOne({ _id: order._id })) ?? {};

		const frames = await new FrameReader(await connect(annotationsStream, key, opening)).drain();
		expect(frames).toHaveLength(1);
		expect(frames[0].data).toMatchObject({
			orderId: order._id,
			labels: [{ id: 'vip', name: 'VIP client' }],
			annotatedAt: annotatedAt?.toISOString()
		});
	});

	it('sends an id with no event as soon as it opens', async () => {
		const key = makeKey();
		const before = Date.now();
		const opening = await openingIdOf(new FrameReader(await connect(annotationsStream, key)));

		const cursor = parseStreamCursor(opening, scopeOf(key, 'annotations'));
		expect(cursor?.orderId).toBe('-');
		expect(cursor?.ms).toBeGreaterThanOrEqual(before);
		expect(cursor?.ms).toBeLessThanOrEqual(Date.now());
	});
});

describe('GET /api/v1/orders/updates/stream: a connection that is cut', () => {
	it('brings back an annotation made after a cut that came before any event', async () => {
		const key = makeKey();
		const order = await annotatedOrder();
		const first = new FrameReader(await connect(annotationsStream, key));
		const opening = await openingIdOf(first);
		expect(await first.next()).toBeNull();
		openConnections[0].abort();
		await pause(5);

		await addOrderNote({ orderId: order._id, content: 'while you were away', keyName: 'Till' });

		const again = await new FrameReader(await connect(annotationsStream, key, opening)).drain();
		expect(again.map((frame) => frame.data?.orderId)).toEqual([order._id]);
	});

	it('brings back each annotated order once, with names, and keeps the sales streams silent', async () => {
		const key = makeKey();
		const noted = await annotatedOrder();
		const labelled = await annotatedOrder();
		const unlabelled = await annotatedOrder();
		const sentinel = await annotatedOrder();

		const annotations = new FrameReader(await connect(annotationsStream, key));
		const opening = await openingIdOf(annotations);
		const all = new FrameReader(await connect(ordersStream, key));
		const paid = new FrameReader(await connect(salesStream, key));
		await openingIdOf(all);
		await openingIdOf(paid);
		openConnections[0].abort();
		await pause(5);

		await addOrderNote({ orderId: noted._id, content: 'first', keyName: 'Till' });
		await addOrderNote({ orderId: noted._id, content: 'second', keyName: 'Till' });
		await addOrderLabel({ orderId: noted._id, labelId: 'vip', label: { name: 'VIP client' } });
		await addOrderLabel({ orderId: labelled._id, labelId: 'late', label: { name: 'Pays late' } });
		await addOrderLabel({ orderId: unlabelled._id, labelId: 'temp', label: { name: 'Temporary' } });
		await collections.orders.updateOne(
			{ _id: unlabelled._id },
			{ $pull: { orderLabelIds: 'temp' }, $set: { annotatedAt: new Date() } }
		);

		// A real change of the order, written after the annotations: once the sales streams
		// have announced it, they had their chance to announce the annotated orders.
		await expect
			.poll(async () => {
				await collections.orders.updateOne(
					{ _id: sentinel._id },
					{ $set: { updatedAt: new Date() } }
				);
				const frame = await all.next(100);
				return frame?.data?.orderId;
			})
			.toBe(sentinel._id);
		const sales = [...(await all.drain()), ...(await paid.drain())];
		expect(sales.map((frame) => frame.data?.orderId).filter((id) => id !== sentinel._id)).toEqual(
			[]
		);

		const frames = await new FrameReader(await connect(annotationsStream, key, opening)).drain();
		const byId = new Map(frames.map((frame) => [frame.data?.orderId, frame.data]));
		expect(frames).toHaveLength(3);
		expect(byId.get(noted._id)).toMatchObject({
			labels: [{ id: 'vip', name: 'VIP client' }],
			notes: [{ content: 'first' }, { content: 'second' }]
		});
		expect(byId.get(labelled._id)).toMatchObject({ labels: [{ id: 'late', name: 'Pays late' }] });
		expect(byId.get(unlabelled._id)).not.toHaveProperty('labels');
	});
});

describe('the sales streams: a connection that is cut before any event', () => {
	it.each([
		['/api/v1/orders/stream', ordersStream],
		['/api/v1/orders/paid/stream', salesStream]
	])('brings back an order paid during the cut, once, on %s', async (_path, handler) => {
		const key = makeKey();
		const first = new FrameReader(await connect(handler, key));
		const opening = await openingIdOf(first);
		expect(await first.next()).toBeNull();
		openConnections[openConnections.length - 1].abort();
		await pause(5);

		const order = await annotatedOrder();

		const frames = await new FrameReader(await connect(handler, key, opening)).drain();
		expect(frames.map((frame) => frame.data?.orderId)).toEqual([order._id]);
	});
});

describe('the sales streams', () => {
	it.each([
		['/api/v1/orders/stream', ordersStream],
		['/api/v1/orders/paid/stream', salesStream]
	])('name the labels of an order on %s', async (_path, handler) => {
		const key = makeKey();
		const order = await annotatedOrder();
		await addOrderLabel({ orderId: order._id, labelId: 'vip', label: { name: 'VIP client' } });
		const reader = new FrameReader(await connect(handler, key));
		await openingIdOf(reader);

		// The watch only sees what is written once its cursor is open: touch until it answers.
		await expect
			.poll(async () => {
				await collections.orders.updateOne({ _id: order._id }, { $set: { updatedAt: new Date() } });
				return (await reader.next(100))?.data;
			})
			.toMatchObject({ orderId: order._id, labels: [{ id: 'vip', name: 'VIP client' }] });
	});
});

describe('GET /api/v1/orders/updates/stream: a real EventSource client', () => {
	let server: Server | undefined;

	afterEach(() => {
		server?.closeAllConnections();
		server?.close();
	});

	it('keeps the opening id and sends it back when the connection comes back', async () => {
		const key = makeKey();
		const requestedWith: Array<string | undefined> = [];
		server = createServer(async (req, res) => {
			const lastEventId = req.headers['last-event-id'] as string | undefined;
			requestedWith.push(lastEventId);
			const controller = new AbortController();
			res.on('close', () => controller.abort());
			const url = `http://localhost${req.url}`;
			const response = await annotationsStream({
				request: new Request(url, {
					headers: lastEventId ? { 'last-event-id': lastEventId } : {},
					signal: controller.signal
				}),
				url: new URL(url),
				params: {},
				locals: { apiKey: key }
			} as unknown as Parameters<Handler>[0]);
			res.writeHead(response.status, Object.fromEntries(response.headers));
			const reader = response.body?.getReader();
			// The first connection is cut right after its opening id, as a flaky network would.
			for (let chunk = await reader?.read(); chunk && !chunk.done; chunk = await reader?.read()) {
				res.write(chunk.value);
				if (requestedWith.length === 1 && Buffer.from(chunk.value).includes('id: ')) {
					controller.abort();
					res.end();
					return;
				}
			}
			res.end();
		});
		await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
		const { port } = server.address() as AddressInfo;

		const source = new EventSource(`http://127.0.0.1:${port}/`);
		try {
			await expect.poll(() => requestedWith.length, { timeout: 15_000 }).toBeGreaterThan(1);
		} finally {
			source.close();
		}

		expect(requestedWith[0]).toBeUndefined();
		expect(parseStreamCursor(requestedWith[1], scopeOf(key, 'annotations'))?.orderId).toBe('-');
	}, 20_000);
});
