import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/database', () => ({ collections: { apiV1Logs: {} } }));

import {
	MAX_LOGGED_BODY_CHARS,
	errorCodeOf,
	isEventStream,
	readBodyForLog,
	truncateBody
} from './log';

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
