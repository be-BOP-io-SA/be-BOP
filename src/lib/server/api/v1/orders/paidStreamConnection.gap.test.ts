import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MongoServerError } from 'mongodb';
import { collections } from '$lib/server/database';
import { closeAllStreams, countOpenStreams, openPaidOrderStream } from './paidStreamConnection';
import { resetPaidOrderStreamHub } from './paidStreamHub';

function stubWatch() {
	const streams: EventEmitter[] = [];
	vi.spyOn(collections.orders, 'watch').mockImplementation((() => {
		const stream = Object.assign(new EventEmitter(), { close: async () => undefined });
		streams.push(stream);
		return stream;
	}) as unknown as typeof collections.orders.watch);
	return { latest: () => streams[streams.length - 1] };
}

const open = (keyId: string) =>
	openPaidOrderStream({ keyId, after: null, feed: 'all', render: () => null });

async function endsOf(res: Response): Promise<boolean> {
	const reader = res.body?.getReader();
	for (;;) {
		const frame = await reader?.read();
		if (!frame || frame.done) {
			return true;
		}
	}
}

describe('a stream open when the order watch loses its position', () => {
	afterEach(() => {
		closeAllStreams();
		resetPaidOrderStreamHub();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it('is closed, so the device reconnects and replays what it missed', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const watch = stubWatch();
		const res = open('gap-key');
		expect(countOpenStreams('gap-key')).toBe(1);

		const codeName = 'ChangeStreamFatalError';
		watch.latest().emit('error', new MongoServerError({ codeName, message: codeName }));

		expect(countOpenStreams('gap-key')).toBe(0);
		await expect(endsOf(res)).resolves.toBe(true);
	});

	it('stays open after a failure that loses nothing', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const watch = stubWatch();
		open('no-gap-key');

		watch.latest().emit('error', new Error('connection reset'));

		expect(countOpenStreams('no-gap-key')).toBe(1);
	});
});
