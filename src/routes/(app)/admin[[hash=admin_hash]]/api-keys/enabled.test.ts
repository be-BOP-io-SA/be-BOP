import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { cleanDb } from '$lib/server/test-utils';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import {
	closeStreamsOfKey,
	countOpenStreams,
	openPaidOrderStream
} from '$lib/server/api/v1/orders/paidStreamConnection';
import { resetPaidOrderStreamHub } from '$lib/server/api/v1/orders/paidStreamHub';
import { actions, load } from './+page.server';

function posting(fields: Record<string, string>) {
	const body = new FormData();
	for (const [name, value] of Object.entries(fields)) {
		body.set(name, value);
	}
	return {
		locals: { user: { roleId: SUPER_ADMIN_ROLE_ID, _id: new ObjectId() } },
		request: new Request('http://localhost/admin/api-keys', { method: 'POST', body })
	} as never;
}

const openStreamOf = (keyId: string) =>
	openPaidOrderStream({ keyId, after: null, feed: 'all', render: () => null });

async function storedApiV1() {
	return (await collections.runtimeConfig.findOne({ _id: 'apiV1' }))?.data as
		| Record<string, unknown>
		| undefined;
}

describe('the general switch of the API, in Admin -> API Keys', () => {
	const keys = [new ObjectId().toString(), new ObjectId().toString()];
	let before: typeof runtimeConfig.apiV1;

	beforeEach(async () => {
		await cleanDb();
		before = runtimeConfig.apiV1;
		runtimeConfig.apiV1 = { ...before, enabled: false };
	});

	afterEach(() => {
		runtimeConfig.apiV1 = before;
		for (const key of keys) {
			closeStreamsOfKey(key);
		}
		resetPaidOrderStreamHub();
	});

	it('shows the shop as switched off until it ticks the box', async () => {
		const page = (await load({
			locals: { user: { roleId: SUPER_ADMIN_ROLE_ID } }
		} as never)) as { apiEnabled: boolean };

		expect(page.apiEnabled).toBe(false);
	});

	it('switches the API on, and stores it', async () => {
		await actions.updateEnabled(posting({ enabled: 'on' }));

		expect(runtimeConfig.apiV1.enabled).toBe(true);
		expect((await storedApiV1())?.enabled).toBe(true);
	});

	it('switches it off when the box is not ticked, keeping the rest of the setting', async () => {
		runtimeConfig.apiV1 = {
			...runtimeConfig.apiV1,
			enabled: true,
			corsOrigins: ['https://a.example']
		};

		await actions.updateEnabled(posting({}));

		expect(runtimeConfig.apiV1).toMatchObject({
			enabled: false,
			corsOrigins: ['https://a.example']
		});
		expect((await storedApiV1())?.enabled).toBe(false);
	});

	it('is left as it was by the form of the CORS origins, which does not carry the box', async () => {
		runtimeConfig.apiV1 = { ...runtimeConfig.apiV1, enabled: true };

		await actions.updateCors(posting({ corsOrigins: 'https://partner.example' }));

		expect(runtimeConfig.apiV1.enabled).toBe(true);
		expect((await storedApiV1())?.enabled).toBe(true);
		expect(runtimeConfig.apiV1.corsOrigins).toEqual(['https://partner.example']);
	});

	it('closes the streams that are open, of every key, when it is switched off', async () => {
		runtimeConfig.apiV1 = { ...runtimeConfig.apiV1, enabled: true };
		openStreamOf(keys[0]);
		openStreamOf(keys[0]);
		openStreamOf(keys[1]);
		expect(keys.map(countOpenStreams)).toEqual([2, 1]);

		await actions.updateEnabled(posting({}));

		expect(keys.map(countOpenStreams)).toEqual([0, 0]);
	});

	it('leaves the streams alone when the box stays ticked', async () => {
		runtimeConfig.apiV1 = { ...runtimeConfig.apiV1, enabled: true };
		openStreamOf(keys[0]);

		await actions.updateEnabled(posting({ enabled: 'on' }));

		expect(countOpenStreams(keys[0])).toBe(1);
	});

	it('is for the super admin alone', async () => {
		await expect(
			actions.updateEnabled({
				locals: { user: { roleId: 'someone-else' } },
				request: new Request('http://localhost', { method: 'POST', body: new FormData() })
			} as never)
		).rejects.toMatchObject({ status: 403 });
	});
});
