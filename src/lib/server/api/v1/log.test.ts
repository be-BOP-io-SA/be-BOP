import { describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

vi.mock('$lib/server/database', () => ({ collections: { apiV1Logs: {} } }));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { apiV1Log: { maxSizeMb: null } }
}));

import { collections } from '$lib/server/database';
import {
	MAX_LOGGED_BODY_CHARS,
	eraseOrderPersonalDataFromApiV1Logs,
	erasePersonalFields,
	errorCodeOf,
	isEventStream,
	listApiV1Logs,
	orderIdsOfCall,
	pruneApiV1Logs,
	readBodyForLog,
	shouldLogApiV1Call,
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
		// Every entry weighs 100 bytes.
		aggregate: () => ({
			toArray: async () => [{ storageStats: { size: ids.length * 100, avgObjSize: 100 } }]
		}),
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
	it('removes the oldest entries past the size limit, and only them', async () => {
		const { ids, deleteMany } = fakeJournal(12);

		await expect(pruneApiV1Logs(1000)).resolves.toBe(2);
		expect(deleteMany).toHaveBeenCalledWith({ _id: { $lte: ids[1] } });
	});

	it('leaves a journal under its size limit alone', async () => {
		const { deleteMany } = fakeJournal(5);

		await expect(pruneApiV1Logs(1000)).resolves.toBe(0);
		expect(deleteMany).not.toHaveBeenCalled();
	});
});

describe('shouldLogApiV1Call', () => {
	const everything = { logSuccesses: true, logErrors: true, logUnauthenticated: true };

	it('files a call with a valid key by its outcome', () => {
		const noErrors = { ...everything, logErrors: false };

		expect(shouldLogApiV1Call({ authenticated: true, status: 200 }, noErrors)).toBe(true);
		expect(shouldLogApiV1Call({ authenticated: true, status: 422 }, noErrors)).toBe(false);
		expect(shouldLogApiV1Call({ authenticated: true, status: 500 }, noErrors)).toBe(false);
	});

	it('files a call without a valid key under its own setting alone', () => {
		const noOutcome = { logSuccesses: false, logErrors: false, logUnauthenticated: true };

		expect(shouldLogApiV1Call({ authenticated: false, status: 401 }, noOutcome)).toBe(true);
		expect(
			shouldLogApiV1Call(
				{ authenticated: false, status: 401 },
				{ ...everything, logUnauthenticated: false }
			)
		).toBe(false);
	});
});

describe('listApiV1Logs', () => {
	/** A journal holding `available` entries for the filter asked. */
	function fakeJournalPage(available: number) {
		let asked = 0;
		const cursor = {
			sort: () => cursor,
			skip: () => cursor,
			limit: (n: number) => {
				asked = n;
				return cursor;
			},
			toArray: async () =>
				Array.from({ length: Math.min(asked, available) }, () => ({ _id: new ObjectId() }))
		};
		const countDocuments = vi.fn();
		Object.assign(collections.apiV1Logs as object, { find: () => cursor, countDocuments });
		return { countDocuments };
	}

	it('says an older page exists without counting the journal', async () => {
		const { countDocuments } = fakeJournalPage(30);

		const page = await listApiV1Logs({ limit: 25 });

		expect(page.entries).toHaveLength(25);
		expect(page.hasMore).toBe(true);
		expect(countDocuments).not.toHaveBeenCalled();
	});

	it('says the last page is the last one', async () => {
		fakeJournalPage(25);

		const page = await listApiV1Logs({ limit: 25 });

		expect(page.entries).toHaveLength(25);
		expect(page.hasMore).toBe(false);
	});
});

describe('orderIdsOfCall', () => {
	it('names the order of the address and every order of the bodies, once each', () => {
		const request = JSON.stringify({ orders: [{ externalOrderId: 'A-1' }] });
		const response = JSON.stringify({
			results: [{ orderId: 'o-1' }, { orderId: 'o-2', payment: { orderId: 'o-1' } }]
		});

		expect(orderIdsOfCall('o-3', [request, response])).toEqual(['o-3', 'o-1', 'o-2']);
	});

	it('names nothing for a body that is not JSON', () => {
		expect(orderIdsOfCall(undefined, ['<html>o-1</html>', undefined])).toEqual([]);
	});
});

describe('erasePersonalFields', () => {
	const personal = new Set(['phone', 'delivery']);
	const order = (orderId: string) => ({
		orderId,
		customFields: [
			{ slug: 'phone', source: 'shop', value: '+41 79 000 00 00', isPersonalData: true },
			{
				slug: 'delivery',
				source: 'shop',
				type: 'address',
				address: { firstName: 'Ada', address: '1 rue du Lac', zip: '1200', country: 'CH' },
				isPersonalData: true
			},
			{ slug: 'table', source: 'shop', value: '12' },
			{ slug: 'phone', source: 'api', value: 'till-7' }
		]
	});

	it('erases the personal fields of the order, the way anonymization does', () => {
		const body = JSON.stringify({ orders: [order('o-1'), order('o-2')] });

		const erased = JSON.parse(erasePersonalFields(body, 'o-1', personal) ?? '{}');

		expect(erased.orders[0].customFields).toEqual([
			{ slug: 'phone', source: 'shop', value: '', isPersonalData: true },
			{
				slug: 'delivery',
				source: 'shop',
				type: 'address',
				address: { zip: '1200', country: 'CH' },
				isPersonalData: true
			},
			{ slug: 'table', source: 'shop', value: '12' },
			{ slug: 'phone', source: 'api', value: 'till-7' }
		]);
		// Another order of the same list keeps its fields.
		expect(erased.orders[1]).toEqual(order('o-2'));
	});

	it('goes by the slug where the body does not flag personal fields', () => {
		const body = JSON.stringify([
			{ orderId: 'o-1', customFields: [{ slug: 'phone', label: 'Phone', value: '+41' }] }
		]);

		expect(JSON.parse(erasePersonalFields(body, 'o-1', personal) ?? '[]')).toEqual([
			{ orderId: 'o-1', customFields: [{ slug: 'phone', label: 'Phone', value: '' }] }
		]);
	});

	it('returns a body with nothing to erase as it was', () => {
		const body = '{ "orders": [] }';

		expect(erasePersonalFields(body, 'o-1', personal)).toBe(body);
	});

	it('gives up a cut body that names the order, and keeps one that does not', () => {
		const cut = '{"orders":[{"orderId":"o-1","custom';
		const other = '{"orders":[{"orderId":"o-2"';

		expect(erasePersonalFields(cut, 'o-1', personal)).toBeUndefined();
		expect(erasePersonalFields(other, 'o-1', personal)).toBe(other);
	});
});

describe('eraseOrderPersonalDataFromApiV1Logs', () => {
	it('rewrites the entries of the order and drops the bodies it cannot read back', async () => {
		const readable = new ObjectId();
		const cut = new ObjectId();
		const response = JSON.stringify({
			orderId: 'o-1',
			customFields: [{ slug: 'phone', value: '+41', isPersonalData: true }]
		});
		const entries = [
			{ _id: readable, requestBody: '{"note":"hi"}', responseBody: response },
			{ _id: cut, responseBody: '{"orderId":"o-1","customFields":[{"slug":"pho' }
		];
		const find = vi.fn(() => entries);
		const bulkWrite = vi.fn(async () => ({}));
		Object.assign(collections.apiV1Logs as object, { find, bulkWrite });

		await eraseOrderPersonalDataFromApiV1Logs('o-1', ['phone']);

		expect(find).toHaveBeenCalledWith({ orderIds: 'o-1' }, expect.anything());
		expect(bulkWrite).toHaveBeenCalledWith([
			{
				updateOne: {
					filter: { _id: readable },
					update: {
						$set: {
							responseBody: JSON.stringify({
								orderId: 'o-1',
								customFields: [{ slug: 'phone', value: '', isPersonalData: true }]
							})
						}
					}
				}
			},
			{ updateOne: { filter: { _id: cut }, update: { $unset: { responseBody: '' } } } }
		]);
	});

	it('does not even look when the order has no personal field', async () => {
		const find = vi.fn(() => []);
		Object.assign(collections.apiV1Logs as object, { find });

		await eraseOrderPersonalDataFromApiV1Logs('o-1', []);

		expect(find).not.toHaveBeenCalled();
	});
});
