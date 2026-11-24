import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { createApiKey } from '$lib/server/api/keys';
import { collections } from '$lib/server/database';
import { cleanDb } from '$lib/server/test-utils';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import { actions } from './+page.server';

function saving(keyId: string, fields: Record<string, string>) {
	const body = new FormData();
	for (const [name, value] of Object.entries(fields)) {
		body.set(name, value);
	}
	return {
		params: { id: keyId },
		locals: { user: { roleId: SUPER_ADMIN_ROLE_ID, _id: new ObjectId() } },
		request: new Request('http://localhost/admin/api-keys', { method: 'POST', body })
	} as never;
}

const everySetting = {
	maxConcurrentStreams: '3',
	streamLifetimeSeconds: '600',
	ownOrdersOnly: 'on',
	acceptDuplicateExternalOrderIds: 'on',
	canDisableNotifications: 'on'
};

describe('saving an API key', () => {
	let keyId: string;

	async function stored() {
		const key = await collections.apiKeys.findOne({ _id: new ObjectId(keyId) });
		return {
			maxConcurrentStreams: key?.maxConcurrentStreams,
			streamLifetimeSeconds: key?.streamLifetimeSeconds,
			ownOrdersOnly: key?.ownOrdersOnly,
			acceptDuplicateExternalOrderIds: key?.acceptDuplicateExternalOrderIds,
			canDisableNotifications: key?.canDisableNotifications
		};
	}

	beforeEach(async () => {
		await cleanDb();
		const { apiKey } = await createApiKey({ name: 'till', scopes: ['orders:stream'] });
		keyId = apiKey._id.toString();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('leaves no key half saved when the database fails after the first write', async () => {
		let writes = 0;
		for (const method of ['updateOne', 'findOneAndUpdate'] as const) {
			const write = collections.apiKeys[method].bind(collections.apiKeys) as (
				...args: unknown[]
			) => Promise<unknown>;
			vi.spyOn(collections.apiKeys, method).mockImplementation(((...args: unknown[]) => {
				if (++writes > 1) {
					throw new Error('database gone');
				}
				return write(...args);
			}) as never);
		}

		await Promise.resolve(actions.save(saving(keyId, everySetting))).catch(() => undefined);

		expect(await stored()).toEqual({
			maxConcurrentStreams: 3,
			streamLifetimeSeconds: 600,
			ownOrdersOnly: true,
			acceptDuplicateExternalOrderIds: true,
			canDisableNotifications: true
		});
	});

	it('stores a setting left empty or unticked as absent', async () => {
		await actions.save(saving(keyId, everySetting));

		await actions.save(saving(keyId, { maxConcurrentStreams: '', streamLifetimeSeconds: '' }));

		expect(await stored()).toEqual({
			maxConcurrentStreams: undefined,
			streamLifetimeSeconds: undefined,
			ownOrdersOnly: undefined,
			acceptDuplicateExternalOrderIds: undefined,
			canDisableNotifications: undefined
		});
	});

	it('saves nothing when a field is refused', async () => {
		const refused = await actions.save(
			saving(keyId, { ...everySetting, streamLifetimeSeconds: '0' })
		);

		expect(refused).toMatchObject({ status: 400 });
		expect((await stored()).ownOrdersOnly).toBeUndefined();
	});
});
