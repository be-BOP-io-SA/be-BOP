import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { createApiKey } from '$lib/server/api/keys';
import {
	closeStreamsOfKey,
	countOpenStreams,
	openPaidOrderStream
} from '$lib/server/api/v1/orders/paidStreamConnection';
import { resetPaidOrderStreamHub } from '$lib/server/api/v1/orders/paidStreamHub';
import { cleanDb } from '$lib/server/test-utils';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import { actions } from './+page.server';

function openStreamOf(keyId: string) {
	return openPaidOrderStream({ keyId, after: null, feed: 'all', render: () => null });
}

function asSuperAdmin(keyId: string) {
	return {
		params: { id: keyId },
		locals: { user: { roleId: SUPER_ADMIN_ROLE_ID, _id: new ObjectId() } }
	} as never;
}

describe('revoking an API key', () => {
	let keyId: string;
	const otherKeyId = new ObjectId().toString();

	beforeEach(async () => {
		await cleanDb();
		const { apiKey } = await createApiKey({ name: 'till', scopes: ['orders:stream'] });
		keyId = apiKey._id.toString();
	});

	afterEach(() => {
		closeStreamsOfKey(keyId);
		closeStreamsOfKey(otherKeyId);
		resetPaidOrderStreamHub();
	});

	it('ends the streams the key had open, and no other', async () => {
		const stream = openStreamOf(keyId);
		openStreamOf(keyId);
		openStreamOf(otherKeyId);
		expect(countOpenStreams(keyId)).toBe(2);

		await expect(actions.revoke(asSuperAdmin(keyId))).rejects.toMatchObject({ status: 303 });

		expect(countOpenStreams(keyId)).toBe(0);
		expect(countOpenStreams(otherKeyId)).toBe(1);
		// The device sees its stream end, rather than a connection gone quiet.
		const reader = stream.body?.getReader();
		for (;;) {
			const frame = await reader?.read();
			if (!frame || frame.done) {
				break;
			}
		}
	});
});
