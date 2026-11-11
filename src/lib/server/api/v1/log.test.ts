import { describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('$lib/server/database', () => ({ collections: { apiV1Logs: {} } }));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { apiV1Log: { maxEntries: 10_000 } }
}));

import { collections } from '$lib/server/database';
import {
	MAX_LOGGED_BODY_CHARS,
	errorCodeOf,
	isEventStream,
	pruneApiV1Logs,
	readBodyForLog,
	truncateBody
} from './log';

/** A journal of `count` entries, oldest first, behind the calls the trim makes. */
function fakeJournal(count: number) {
	const ids = Array.from({ length: count }, () => new ObjectId());
	let skipped = 0;
	const cursor = {
		sort: () => cursor,
		skip: (n: number) => {
			skipped = n;
			return cursor;
		},
		limit: () => cursor,
		next: async () => (ids[skipped] ? { _id: ids[skipped] } : null)
	};
	const deleteMany = vi.fn(async (filter: { _id: { $lte: ObjectId } }) => ({
		deletedCount: ids.filter((id) => id.toHexString() <= filter._id.$lte.toHexString()).length
	}));
	Object.assign(collections.apiV1Logs as object, {
		estimatedDocumentCount: async () => ids.length,
		find: () => cursor,
		deleteMany
	});
	return { ids, deleteMany };
}

describe('truncateBody', () => {
	it('keeps a short body whole', () => {
		expect(truncateBody('{"ok":true}')).toEqual({ body: '{"ok":true}', truncated: false });
	});

	it('keeps the head of a long one and says so', () => {
		const result = truncateBody('x'.repeat(MAX_LOGGED_BODY_CHARS + 500));

		expect(result.truncated).toBe(true);
		expect(result.body).toHaveLength(MAX_LOGGED_BODY_CHARS);
	});
});

describe('errorCodeOf', () => {
	it('reads the code out of an error envelope', () => {
		expect(errorCodeOf('{"error":{"code":"RATE_LIMITED","message":"…"}}')).toBe('RATE_LIMITED');
	});

	it('says nothing for a successful answer', () => {
		expect(errorCodeOf('{"ok":true}')).toBeUndefined();
	});

	it('says nothing for a body that is not JSON', () => {
		expect(errorCodeOf('<html>nope</html>')).toBeUndefined();
	});
});

describe('isEventStream', () => {
	it('recognises a stream, whatever its charset', () => {
		expect(isEventStream('text/event-stream; charset=utf-8')).toBe(true);
	});

	it('does not confuse it with JSON', () => {
		expect(isEventStream('application/json')).toBe(false);
	});
});

describe('readBodyForLog', () => {
	it('reads a JSON body', async () => {
		const request = new Request('http://localhost/api/v1/orders', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{"externalOrderId":"A-1"}'
		});

		await expect(readBodyForLog(request)).resolves.toBe('{"externalOrderId":"A-1"}');
	});

	it('leaves a picture alone', async () => {
		const response = new Response('binary-ish', { headers: { 'content-type': 'image/png' } });

		await expect(readBodyForLog(response)).resolves.toBeUndefined();
	});

	it('does not buffer a payload announced as enormous', async () => {
		const response = new Response('{"a":1}', {
			headers: { 'content-type': 'application/json', 'content-length': '900000' }
		});

		await expect(readBodyForLog(response)).resolves.toBeUndefined();
	});
});

describe('pruneApiV1Logs', () => {
	it('removes the oldest entries past the ceiling, and only them', async () => {
		const { ids, deleteMany } = fakeJournal(12);

		await expect(pruneApiV1Logs(10)).resolves.toBe(2);
		expect(deleteMany).toHaveBeenCalledWith({ _id: { $lte: ids[1] } });
	});

	it('leaves a journal under its ceiling alone', async () => {
		const { deleteMany } = fakeJournal(5);

		await expect(pruneApiV1Logs(10)).resolves.toBe(0);
		expect(deleteMany).not.toHaveBeenCalled();
	});
});
