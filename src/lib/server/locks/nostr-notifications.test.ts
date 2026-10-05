import { ObjectId } from 'mongodb';
import { bech32 } from 'bech32';
import { Kind } from 'nostr-tools';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { collections } from '../database';
import { cleanDb } from '../test-utils';
import { runtimeConfig } from '../runtime-config';
import { resetNostrKeys } from '../nostr';

vi.mock('nostr-relaypool', () => ({
	RelayPool: class {
		subscribe() {}
		publish() {}
		close() {
			return Promise.resolve();
		}
	}
}));

import { processUnprocessedNotifications } from './nostr-notifications';

function notification(overrides: Record<string, unknown>) {
	return {
		_id: new ObjectId(),
		content: 'hello',
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides
	};
}

describe('processUnprocessedNotifications', () => {
	beforeEach(async () => {
		await cleanDb();
		runtimeConfig.nostr.privateKey = bech32.encode('nsec', bech32.toWords(Buffer.alloc(32, 7)));
		resetNostrKeys();
	});

	it('keeps going after a notification that cannot be sent', async () => {
		const malformedNpub = bech32.encode('npub', bech32.toWords(Buffer.alloc(0)));
		const broken = notification({ kind: Kind.EncryptedDirectMessage, dest: malformedNpub });
		const sendable = notification({ kind: Kind.Zap });
		await collections.nostrNotifications.insertMany([broken, sendable] as never);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await processUnprocessedNotifications();

		expect(
			(await collections.nostrNotifications.findOne({ _id: sendable._id }))?.processedAt
		).toBeDefined();
		expect(
			(await collections.nostrNotifications.findOne({ _id: broken._id }))?.processedAt
		).toBeUndefined();
	});
});
