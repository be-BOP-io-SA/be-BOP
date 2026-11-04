import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	isAddressWatched,
	resetMempoolWebSocket,
	watchMempoolAddresses
} from './bitcoin-nodeless-ws';
import { runtimeConfig } from './runtime-config';
import { advance, FakeWebSocket } from './test-utils';

const WANT_BLOCKS = { action: 'want', data: ['blocks'] };
const PING = { action: 'ping' };

function addresses(count: number, prefix = 'bc1qaddress'): string[] {
	return Array.from({ length: count }, (_, i) => `${prefix}${String(i).padStart(3, '0')}`);
}

let reported: { activity: string[]; blocks: number[] };

function watch(list: string[]) {
	watchMempoolAddresses(list, {
		onActivity: (address) => reported.activity.push(address),
		onBlock: (height) => reported.blocks.push(height)
	});
}

function sockets() {
	return FakeWebSocket.instances;
}

function lastSocket() {
	return sockets()[sockets().length - 1];
}

function trackedLists(socket: FakeWebSocket) {
	return socket.sent
		.filter((message): message is { 'track-addresses': string[] } =>
			Object.hasOwn(message as object, 'track-addresses')
		)
		.map((message) => message['track-addresses']);
}

function lastTrackedList(socket: FakeWebSocket) {
	return trackedLists(socket).at(-1);
}

function pingsSentTo(socket: FakeWebSocket) {
	return socket.sent.filter((m) => JSON.stringify(m) === JSON.stringify(PING)).length;
}

/** Calls the watcher every 500ms until a new socket opens, and returns how long that took. */
function measureReconnectDelay(list: string[]): number {
	const before = sockets().length;
	let waited = 0;
	while (sockets().length === before) {
		advance(500);
		waited += 500;
		watch(list);
	}
	return waited;
}

const LIMIT_OF_ONE = {
	'track-addresses-error':
		'too many addresses requested, this connection supports tracking a maximum of 1 addresses'
};

describe('watchMempoolAddresses', () => {
	beforeEach(() => {
		resetMempoolWebSocket();
		FakeWebSocket.instances = [];
		reported = { activity: [], blocks: [] };
		vi.stubGlobal('WebSocket', FakeWebSocket);
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
		vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
		runtimeConfig.bitcoinNodeless = {
			...runtimeConfig.bitcoinNodeless,
			mempoolUrl: 'https://mempool.example/'
		};
	});

	afterEach(() => {
		resetMempoolWebSocket();
		vi.unstubAllGlobals();
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('spreads addresses over sockets of 10 and subscribes them once open', () => {
		const list = addresses(25);

		watch([...list, list[3]]);

		expect(sockets().map((s) => s.url)).toEqual(Array(3).fill('wss://mempool.example/api/v1/ws'));
		expect(isAddressWatched(list[0])).toBe(false);

		sockets().forEach((s) => s.serverOpens());

		expect(sockets().map((s) => s.sent)).toEqual([
			[WANT_BLOCKS, { 'track-addresses': list.slice(0, 10) }],
			[WANT_BLOCKS, { 'track-addresses': list.slice(10, 20) }],
			[WANT_BLOCKS, { 'track-addresses': list.slice(20, 25) }]
		]);
		expect([isAddressWatched(list[0]), isAddressWatched(list[24])]).toEqual([true, true]);

		watch(list);
		expect(sockets().map((s) => s.sent.length)).toEqual([2, 2, 2]);
	});

	it('connects to a plain http mempool over ws', () => {
		runtimeConfig.bitcoinNodeless.mempoolUrl = 'http://localhost:8999';

		watch(addresses(1));

		expect(sockets().map((s) => s.url)).toEqual(['ws://localhost:8999/api/v1/ws']);
	});

	it('opens at most 5 sockets and leaves the other addresses to HTTP polling', () => {
		const list = addresses(55);

		watch(list);
		sockets().forEach((s) => s.serverOpens());

		expect(sockets()).toHaveLength(5);
		expect(lastTrackedList(sockets()[4])).toEqual(list.slice(40, 50));
		expect([isAddressWatched(list[49]), isAddressWatched(list[50])]).toEqual([true, false]);
	});

	it('keeps every address on its socket, so only the socket that changes resubscribes', () => {
		const list = addresses(25);
		const [added, ...later] = addresses(4, 'bc1qnew');
		watch(list);
		sockets().forEach((s) => s.serverOpens());

		watch([added, ...list.filter((a) => a !== list[3])]);

		expect(sockets().map(trackedLists)).toEqual([
			[list.slice(0, 10), [...list.slice(0, 3), ...list.slice(4, 10), added]],
			[list.slice(10, 20)],
			[list.slice(20, 25)]
		]);
		expect([isAddressWatched(list[3]), isAddressWatched(added)]).toEqual([false, true]);

		const firstTwenty = [added, ...list.slice(0, 20).filter((a) => a !== list[3])];
		watch([...firstTwenty, ...later]);

		expect(sockets()).toHaveLength(3);
		expect(sockets().map(trackedLists)[2]).toEqual([list.slice(20, 25), later]);
		expect(sockets().map((s) => s.sent.length)).toEqual([3, 2, 3]);

		watch(firstTwenty);

		expect(sockets().map((s) => s.closedByClient)).toEqual([false, false, true]);
		expect(sockets().map((s) => s.sent.length)).toEqual([3, 2, 3]);
	});

	it('closes every socket on an empty list', () => {
		const list = addresses(12);
		watch(list);
		sockets().forEach((s) => s.serverOpens());

		watch([]);

		expect(sockets().map((s) => s.closedByClient)).toEqual([true, true]);
		expect(isAddressWatched(list[0])).toBe(false);
	});

	it('moves to a new mempool when the configured URL changes', () => {
		watch(addresses(2));
		sockets()[0].serverOpens();

		runtimeConfig.bitcoinNodeless.mempoolUrl = 'https://other-mempool.example';
		watch(addresses(2));

		expect(sockets().map((s) => [s.url, s.closedByClient])).toEqual([
			['wss://mempool.example/api/v1/ws', true],
			['wss://other-mempool.example/api/v1/ws', false]
		]);
	});

	it('ignores a socket of the previous mempool URL and moves to the new one before the next call', () => {
		const [address] = addresses(1);
		watch([address]);
		sockets()[0].serverOpens();
		reported.activity = [];

		runtimeConfig.bitcoinNodeless.mempoolUrl = 'https://testnet-mempool.example';
		sockets()[0].serverSends({ block: { height: 4_800_000 } });
		sockets()[0].serverReportsActivity(address);

		expect(reported).toEqual({ activity: [], blocks: [] });
		expect(sockets().map((s) => [s.url, s.closedByClient])).toEqual([
			['wss://mempool.example/api/v1/ws', true],
			['wss://testnet-mempool.example/api/v1/ws', false]
		]);
	});

	it('reports mempool and confirmed activity on a watched address, not on others', () => {
		const [first, second] = addresses(2);
		watch([first, second]);
		sockets()[0].serverOpens();

		reported.activity = [];

		sockets()[0].serverReportsActivity(first, 'mempool');
		sockets()[0].serverReportsActivity(second, 'confirmed');
		sockets()[0].serverReportsActivity('bc1qsomeoneelse', 'mempool');

		expect(reported).toEqual({ activity: [first, second], blocks: [] });
	});

	it('reports every address of a socket as active when it opens, since a gap may have hidden a transaction', () => {
		const list = addresses(12);
		watch(list);

		sockets()[1].serverOpens();
		expect(reported.activity).toEqual(list.slice(10, 12));
		sockets()[1].serverDrops();
		advance(1_000);
		watch(list);
		lastSocket().serverOpens();

		expect(reported.activity).toEqual([...list.slice(10, 12), ...list.slice(10, 12)]);
	});

	it('reports the highest block height of each block message', () => {
		watch(addresses(1));
		sockets()[0].serverOpens();
		reported.activity = [];

		sockets()[0].serverSends({
			blocks: [{ height: 870_000 }, { height: 870_001 }],
			mempoolInfo: { size: 1 }
		});
		sockets()[0].serverSends({ block: { height: 870_002, id: 'abc' } });

		expect(reported).toEqual({ activity: [], blocks: [870_001, 870_002] });
	});

	describe('on its own timer, with no further call', () => {
		it('pings a socket silent for 30 seconds, once until it answers', () => {
			watch(addresses(1));
			const socket = sockets()[0];
			socket.serverOpens();

			vi.advanceTimersByTime(29_999);
			expect(pingsSentTo(socket)).toBe(0);
			vi.advanceTimersByTime(1);
			expect(pingsSentTo(socket)).toBe(1);
			vi.advanceTimersByTime(5_000);
			expect(pingsSentTo(socket)).toBe(1);
			socket.serverSends({ pong: true });
			vi.advanceTimersByTime(29_999);
			expect(pingsSentTo(socket)).toBe(1);
			vi.advanceTimersByTime(1);
			expect(pingsSentTo(socket)).toBe(2);
		});

		it('pings a socket silent for 30 seconds, recycles it at 60 seconds, then reconnects', () => {
			const list = addresses(1);
			watch(list);
			const socket = sockets()[0];
			socket.serverOpens();

			vi.advanceTimersByTime(29_999);
			expect([pingsSentTo(socket), socket.closedByClient]).toEqual([0, false]);
			vi.advanceTimersByTime(1);
			expect([pingsSentTo(socket), socket.closedByClient]).toEqual([1, false]);
			vi.advanceTimersByTime(29_999);
			expect([pingsSentTo(socket), socket.closedByClient]).toEqual([1, false]);
			vi.advanceTimersByTime(1);
			expect([socket.closedByClient, isAddressWatched(list[0])]).toEqual([true, false]);

			vi.advanceTimersByTime(5_000);
			expect(sockets()).toHaveLength(2);
		});

		it('gives up on a socket still connecting after 30 seconds, then reconnects', () => {
			watch(addresses(1));

			vi.advanceTimersByTime(29_999);
			expect(sockets()[0].closedByClient).toBe(false);
			vi.advanceTimersByTime(1);
			expect(sockets()[0].closedByClient).toBe(true);

			vi.advanceTimersByTime(5_000);
			expect(sockets()).toHaveLength(2);
		});

		it('stops its timer once no socket is wanted, so nothing runs after closing', () => {
			const list = addresses(1);
			watch(list);
			expect(vi.getTimerCount()).toBe(1);

			watch([]);
			expect(vi.getTimerCount()).toBe(0);
			vi.advanceTimersByTime(120_000);
			expect(sockets()).toHaveLength(1);

			watch(list);
			resetMempoolWebSocket();
			expect(vi.getTimerCount()).toBe(0);
		});
	});

	it('keeps growing the reconnect delay of a socket that never answers, even after 60 seconds open', () => {
		const list = addresses(1);
		watch(list);

		const delays = [];
		for (let i = 0; i < 3; i++) {
			lastSocket().serverOpens();
			advance(60_000);
			watch(list);
			delays.push(measureReconnectDelay(list));
		}

		expect(delays).toEqual([1000, 2000, 4000]);
	});

	it('waits 1s, 2s, 4s... up to 60s after sockets that close quickly, and 1s after one that stayed open 60s', () => {
		const list = addresses(2);
		watch(list);

		function openDropAndMeasureReconnectDelay(openFor: number): number {
			lastSocket().serverOpens();
			advance(openFor);
			lastSocket().serverSends({ pong: true });
			lastSocket().serverDrops();
			return measureReconnectDelay(list);
		}

		const quickDelays = Array.from({ length: 8 }, () => openDropAndMeasureReconnectDelay(2_000));
		expect(quickDelays).toEqual([1000, 2000, 4000, 8000, 16_000, 32_000, 60_000, 60_000]);

		expect(openDropAndMeasureReconnectDelay(60_000)).toBe(1000);
		expect(lastTrackedList(sockets()[sockets().length - 2])).toEqual(list);
	});

	it('recycles only the socket whose address tracking was refused for an unknown reason', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const list = addresses(12);
		watch(list);
		sockets().forEach((s) => s.serverOpens());

		sockets()[0].serverSends({ 'track-addresses-error': 'address tracking is disabled' });

		expect(sockets().map((s) => s.closedByClient)).toEqual([true, false]);
		expect([isAddressWatched(list[0]), isAddressWatched(list[11])]).toEqual([false, true]);

		advance(1_000);
		watch(list);
		expect(sockets()).toHaveLength(3);
		lastSocket().serverOpens();
		expect(lastTrackedList(lastSocket())).toEqual(list.slice(0, 10));

		lastSocket().serverSends({ 'track-addresses-error': 'address tracking is disabled' });
		advance(1_000);
		watch(list);
		expect(sockets()).toHaveLength(3);
		advance(1_000);
		watch(list);
		expect(sockets()).toHaveLength(4);
		expect(warn.mock.calls).toEqual([
			['Mempool WebSocket refused address tracking:', 'address tracking is disabled']
		]);
	});

	it('stops using sockets on a server that tracks no address, until the URL changes', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const list = addresses(12);
		watch(list);
		sockets().forEach((s) => s.serverOpens());

		const limitOfZero = {
			'track-addresses-error':
				'too many addresses requested, this connection supports tracking a maximum of 0 addresses'
		};
		sockets()[0].serverSends(limitOfZero);
		sockets()[1].serverSends(limitOfZero);

		expect(sockets().map((s) => s.closedByClient)).toEqual([true, true]);
		advance(120_000);
		watch(list);
		expect([sockets().length, isAddressWatched(list[0])]).toEqual([2, false]);
		expect(warn.mock.calls).toEqual([
			['Mempool WebSocket does not track addresses on this server, polling over HTTP only']
		]);

		runtimeConfig.bitcoinNodeless.mempoolUrl = 'https://other-mempool.example';
		watch(list);
		expect(sockets().map((s) => s.url)).toEqual([
			'wss://mempool.example/api/v1/ws',
			'wss://mempool.example/api/v1/ws',
			'wss://other-mempool.example/api/v1/ws',
			'wss://other-mempool.example/api/v1/ws'
		]);
	});

	it('lowers the addresses per socket to the limit the server announces', () => {
		const list = addresses(25);
		watch(list);
		sockets().forEach((s) => s.serverOpens());

		sockets()[0].serverSends(LIMIT_OF_ONE);
		expect(sockets()).toHaveLength(5);
		sockets()
			.slice(3)
			.forEach((s) => s.serverOpens());

		expect(sockets().map(lastTrackedList)).toEqual([
			[list[0]],
			[list[10]],
			[list[20]],
			[list[1]],
			[list[2]]
		]);
		expect([isAddressWatched(list[1]), isAddressWatched(list[3])]).toEqual([true, false]);

		// The other sockets answer the 10-address lists they got before the limit was known.
		sockets()[1].serverSends(LIMIT_OF_ONE);
		watch(list);
		expect(sockets()).toHaveLength(5);
		expect(sockets().map((s) => s.closedByClient)).toEqual([false, false, false, false, false]);
		expect(isAddressWatched(list[10])).toBe(true);
	});

	it('ignores messages it cannot read, logs once, and keeps working', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const [address] = addresses(1);
		watch([address]);
		const socket = sockets()[0];
		socket.serverOpens();
		reported.activity = [];

		for (const garbage of [
			'not json {',
			'42',
			{ block: 'garbage' },
			{ blocks: [{ height: 'x' }] },
			{ block: JSON.stringify({ height: 870_002 }) }
		]) {
			socket.serverSends(garbage);
		}
		socket.serverReportsActivity(address);

		expect(reported).toEqual({ activity: [address], blocks: [] });
		expect(warn.mock.calls).toEqual([
			['Ignoring unreadable mempool WebSocket message:', 'not json {']
		]);
	});
});
