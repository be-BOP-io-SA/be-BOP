import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { createApiKey, updateApiKeySettings } from './keys';
import {
	apiKeySettingsOfKeySchema,
	REPEATED_EXTERNAL_IDS_ON_POS_KEY,
	streamSettingsRefusal,
	type ApiKeySettings
} from './stream-settings';

const settings = (over: Partial<ApiKeySettings> = {}): ApiKeySettings => ({
	maxConcurrentStreams: null,
	streamLifetimeSeconds: null,
	ownOrdersOnly: false,
	acceptDuplicateExternalOrderIds: false,
	canDisableNotifications: false,
	...over
});

const formInput = (scopes: string[], accept: boolean) => ({
	maxConcurrentStreams: '',
	streamLifetimeSeconds: '',
	ownOrdersOnly: false,
	acceptDuplicateExternalOrderIds: accept,
	canDisableNotifications: false,
	scopes
});

describe('several orders per external id, and the keys of a till', () => {
	describe('in the settings schema of a key', () => {
		it('refuses the option on a key with a point-of-sale right, and says why apart', () => {
			for (const scope of ['pos:read', 'pos:write', 'pos:stream']) {
				const parsed = apiKeySettingsOfKeySchema.safeParse(formInput([scope, 'orders:read'], true));

				expect(parsed.success, scope).toBe(false);
				if (!parsed.success) {
					expect(streamSettingsRefusal(parsed.error)).toMatchObject({
						repeatedIdsOnPosKey: true,
						error: { formErrors: [], fieldErrors: {} }
					});
				}
			}
		});

		it('takes the option on a key without a point-of-sale right', () => {
			const parsed = apiKeySettingsOfKeySchema.safeParse(
				formInput(['orders:write', 'orders:stream'], true)
			);

			expect(parsed.success).toBe(true);
		});

		it('takes a key with a point-of-sale right when the option is off', () => {
			expect(apiKeySettingsOfKeySchema.safeParse(formInput(['pos:write'], false)).success).toBe(
				true
			);
		});
	});

	describe('when a key is written', () => {
		beforeEach(async () => {
			await cleanDb();
		});

		it('refuses to create a key with a point-of-sale right and the option', async () => {
			await expect(
				createApiKey({
					name: 'till',
					scopes: ['pos:write'],
					acceptDuplicateExternalOrderIds: true
				})
			).rejects.toThrow(REPEATED_EXTERNAL_IDS_ON_POS_KEY);

			expect(await collections.apiKeys.countDocuments({})).toBe(0);
		});

		it('creates a key without a point-of-sale right with the option, as before', async () => {
			const { apiKey } = await createApiKey({
				name: 'integration',
				scopes: ['orders:write'],
				acceptDuplicateExternalOrderIds: true
			});

			expect(apiKey.acceptDuplicateExternalOrderIds).toBe(true);
		});

		it('refuses to save the option on a key that has a point-of-sale right', async () => {
			const { apiKey } = await createApiKey({ name: 'till', scopes: ['pos:read'] });

			await expect(
				updateApiKeySettings(apiKey._id, settings({ acceptDuplicateExternalOrderIds: true }))
			).rejects.toThrow(REPEATED_EXTERNAL_IDS_ON_POS_KEY);

			const stored = await collections.apiKeys.findOne({ _id: apiKey._id });
			expect(stored?.acceptDuplicateExternalOrderIds).toBeUndefined();
		});

		it('saves the option on a key without a point-of-sale right', async () => {
			const { apiKey } = await createApiKey({ name: 'integration', scopes: ['orders:write'] });

			await updateApiKeySettings(apiKey._id, settings({ acceptDuplicateExternalOrderIds: true }));

			const stored = await collections.apiKeys.findOne({ _id: apiKey._id });
			expect(stored?.acceptDuplicateExternalOrderIds).toBe(true);
		});

		it('lets a key that holds both be saved once the option is off', async () => {
			const { apiKey } = await createApiKey({ name: 'till', scopes: ['pos:write'] });
			await collections.apiKeys.updateOne(
				{ _id: apiKey._id },
				{ $set: { acceptDuplicateExternalOrderIds: true } }
			);

			await updateApiKeySettings(apiKey._id, settings());

			const stored = await collections.apiKeys.findOne({ _id: apiKey._id });
			expect(stored?.acceptDuplicateExternalOrderIds).toBeUndefined();
		});
	});
});
