import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { createApiKey, isApiKeyUsable } from './keys';
import {
	MAX_SUSPICIOUS_DETAIL_LENGTH,
	MAX_SUSPICIOUS_EVENTS,
	clearSuspiciousFlag,
	listSuspiciousEvents,
	reportSuspiciousCall
} from './suspicious';

const CALL = 'POST /api/v1/orders/{orderId}/labels';

describe('suspicious API keys', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('flags the key and records the call in its own journal', async () => {
		const { apiKey } = await createApiKey({ name: 'till', scopes: ['orders:write'] });
		const { apiKey: other } = await createApiKey({ name: 'other', scopes: ['orders:write'] });

		await reportSuspiciousCall(apiKey._id, {
			type: 'labelColorCss',
			call: CALL,
			detail: 'red; background: url(https://x.example/a.png)'
		});

		const stored = await collections.apiKeys.findOne({ _id: apiKey._id });
		expect(stored?.suspiciousAt).toBeInstanceOf(Date);
		expect(await listSuspiciousEvents(apiKey._id)).toMatchObject([
			{ type: 'labelColorCss', call: CALL, detail: 'red; background: url(https://x.example/a.png)' }
		]);
		expect((await collections.apiKeys.findOne({ _id: other._id }))?.suspiciousAt).toBeUndefined();
		expect(await listSuspiciousEvents(other._id)).toEqual([]);
	});

	it('keeps the key usable: flagging is not suspending', async () => {
		const { apiKey } = await createApiKey({ name: 'till', scopes: ['orders:write'] });
		await reportSuspiciousCall(apiKey._id, { type: 'labelColorCss', call: CALL, detail: 'x:y' });

		const stored = await collections.apiKeys.findOne({ _id: apiKey._id });
		expect(stored && isApiKeyUsable(stored)).toBe(true);
	});

	it('keeps the date the key was first flagged, and lists the latest call first', async () => {
		const { apiKey } = await createApiKey({ name: 'till', scopes: ['orders:write'] });
		await reportSuspiciousCall(apiKey._id, {
			type: 'labelColorCss',
			call: CALL,
			detail: 'first:1'
		});
		const firstFlag = (await collections.apiKeys.findOne({ _id: apiKey._id }))?.suspiciousAt;
		await new Promise((resolve) => setTimeout(resolve, 5));
		await reportSuspiciousCall(apiKey._id, {
			type: 'labelColorCss',
			call: CALL,
			detail: 'second:2'
		});

		const stored = await collections.apiKeys.findOne({ _id: apiKey._id });
		expect(stored?.suspiciousAt).toEqual(firstFlag);
		expect((await listSuspiciousEvents(apiKey._id)).map((event) => event.detail)).toEqual([
			'second:2',
			'first:1'
		]);
	});

	it('cuts what it keeps of each call, and keeps only the latest calls', async () => {
		const { apiKey } = await createApiKey({ name: 'till', scopes: ['orders:write'] });
		await reportSuspiciousCall(apiKey._id, {
			type: 'labelColorCss',
			call: CALL,
			detail: 'a:'.repeat(MAX_SUSPICIOUS_DETAIL_LENGTH)
		});
		for (let i = 0; i < MAX_SUSPICIOUS_EVENTS; i++) {
			await reportSuspiciousCall(apiKey._id, {
				type: 'labelColorCss',
				call: CALL,
				detail: `n:${i}`
			});
		}

		const events = await listSuspiciousEvents(apiKey._id);
		expect(events).toHaveLength(MAX_SUSPICIOUS_EVENTS);
		expect(events[0].detail).toBe(`n:${MAX_SUSPICIOUS_EVENTS - 1}`);
		expect(events.some((event) => event.detail.length > MAX_SUSPICIOUS_DETAIL_LENGTH)).toBe(false);
	});

	it('takes the flag off by hand and keeps the journal', async () => {
		const { apiKey } = await createApiKey({ name: 'till', scopes: ['orders:write'] });
		await reportSuspiciousCall(apiKey._id, { type: 'labelColorCss', call: CALL, detail: 'x:y' });

		expect(await clearSuspiciousFlag(apiKey._id)).toBe(true);

		const stored = await collections.apiKeys.findOne({ _id: apiKey._id });
		expect(stored?.suspiciousAt).toBeUndefined();
		expect(await listSuspiciousEvents(apiKey._id)).toHaveLength(1);
	});
});
