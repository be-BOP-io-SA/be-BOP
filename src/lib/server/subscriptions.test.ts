import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { collections, withTransaction } from './database';
import { runtimeConfig } from './runtime-config';
import { resolveSubscriptionDuration, resolveSubscriptionReminderSeconds } from './subscriptions';
import { migrations } from './migrations';
import { cleanDb } from './test-utils';
import { TEST_SUBSCRIPTION_PRODUCT } from './seed/product';
import type { SubscriptionDuration } from '$lib/types/SubscriptionDuration';

describe('resolveSubscriptionDuration', () => {
	let oldDuration: typeof runtimeConfig.subscriptionDuration;

	beforeAll(() => {
		oldDuration = runtimeConfig.subscriptionDuration;
	});

	beforeEach(() => {
		runtimeConfig.subscriptionDuration = 'month';
	});

	afterAll(() => {
		runtimeConfig.subscriptionDuration = oldDuration;
	});

	it('returns the per-product duration when defined', () => {
		expect(resolveSubscriptionDuration({ subscriptionDuration: 'year' })).toBe('year');
		expect(resolveSubscriptionDuration({ subscriptionDuration: 'week' })).toBe('week');
	});

	it('falls back to the global default when the product has no duration', () => {
		expect(resolveSubscriptionDuration({})).toBe('month');
	});

	it('falls back to the global default when the per-product value is an empty string', () => {
		expect(resolveSubscriptionDuration({ subscriptionDuration: '' })).toBe('month');
	});

	it('reflects a change to the global default', () => {
		runtimeConfig.subscriptionDuration = 'year';
		expect(resolveSubscriptionDuration({})).toBe('year');
		expect(resolveSubscriptionDuration({ subscriptionDuration: '' })).toBe('year');
	});

	it('still wins over a different global when the product duration is set', () => {
		runtimeConfig.subscriptionDuration = 'year';
		expect(resolveSubscriptionDuration({ subscriptionDuration: 'hour' })).toBe('hour');
	});
});

describe('resolveSubscriptionReminderSeconds', () => {
	const ONE_DAY = 24 * 60 * 60;
	let oldReminder: typeof runtimeConfig.subscriptionReminderSeconds;

	beforeAll(() => {
		oldReminder = runtimeConfig.subscriptionReminderSeconds;
	});

	beforeEach(() => {
		runtimeConfig.subscriptionReminderSeconds = ONE_DAY;
	});

	afterAll(() => {
		runtimeConfig.subscriptionReminderSeconds = oldReminder;
	});

	it('returns the per-product reminder when defined', () => {
		expect(resolveSubscriptionReminderSeconds({ subscriptionReminderSeconds: 3600 })).toBe(3600);
	});

	it('falls back to the global default when the product has no reminder', () => {
		expect(resolveSubscriptionReminderSeconds({})).toBe(ONE_DAY);
	});

	it('reflects a change to the global default', () => {
		runtimeConfig.subscriptionReminderSeconds = 7 * ONE_DAY;
		expect(resolveSubscriptionReminderSeconds({})).toBe(7 * ONE_DAY);
	});

	it('still wins over a different global when the per-product reminder is set', () => {
		runtimeConfig.subscriptionReminderSeconds = 7 * ONE_DAY;
		expect(resolveSubscriptionReminderSeconds({ subscriptionReminderSeconds: 300 })).toBe(300);
	});
});

describe('migration #2388: subscriptionDuration backfill', () => {
	const MIGRATION_ID = '6b1f4880e92e590e85af2388';
	let migration: (typeof migrations)[number] | undefined;

	beforeAll(() => {
		migration = migrations.find((m) => m._id.toString() === MIGRATION_ID);
	});

	beforeEach(async () => {
		await cleanDb();
	});

	async function runMigration() {
		await withTransaction(async (session) => {
			if (!migration) {
				throw new Error(`migration ${MIGRATION_ID} must exist`);
			}
			await migration.run(session);
		});
	}

	it('backfills products missing subscriptionDuration with the global value', async () => {
		await collections.runtimeConfig.insertOne({
			_id: 'subscriptionDuration',
			data: 'year' as never,
			updatedAt: new Date()
		});
		await collections.products.insertOne({
			...TEST_SUBSCRIPTION_PRODUCT,
			_id: 'sub-no-duration'
		});

		await runMigration();

		const updated = await collections.products.findOne({ _id: 'sub-no-duration' });
		expect(updated?.subscriptionDuration).toBe('year');
	});

	it('defaults to "month" when no global config is set', async () => {
		await collections.products.insertOne({
			...TEST_SUBSCRIPTION_PRODUCT,
			_id: 'sub-no-config'
		});

		await runMigration();

		const updated = await collections.products.findOne({ _id: 'sub-no-config' });
		expect(updated?.subscriptionDuration).toBe('month');
	});

	it('leaves products with an existing subscriptionDuration untouched', async () => {
		await collections.runtimeConfig.insertOne({
			_id: 'subscriptionDuration',
			data: 'year' as never,
			updatedAt: new Date()
		});
		await collections.products.insertOne({
			...TEST_SUBSCRIPTION_PRODUCT,
			_id: 'sub-with-duration',
			subscriptionDuration: 'week' satisfies SubscriptionDuration
		});

		await runMigration();

		const updated = await collections.products.findOne({ _id: 'sub-with-duration' });
		expect(updated?.subscriptionDuration).toBe('week');
	});

	it('is idempotent — re-running does not change anything', async () => {
		await collections.runtimeConfig.insertOne({
			_id: 'subscriptionDuration',
			data: 'year' as never,
			updatedAt: new Date()
		});
		await collections.products.insertOne({
			...TEST_SUBSCRIPTION_PRODUCT,
			_id: 'sub-idempotent'
		});

		await runMigration();
		const first = await collections.products.findOne({ _id: 'sub-idempotent' });
		await runMigration();
		const second = await collections.products.findOne({ _id: 'sub-idempotent' });

		expect(second?.subscriptionDuration).toBe(first?.subscriptionDuration);
		expect(second?.subscriptionDuration).toBe('year');
	});
});
