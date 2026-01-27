import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from '../test-utils';
import { collections } from '../database';
import { addHours, subDays } from 'date-fns';
import {
	getSubscriptionsToRemindViaEmail,
	getSubscriptionsToRemindViaNostr,
	getSubscriptionsToNotifyEndViaEmail
} from './subscription-lock';

// Test constants
const REMINDER_WINDOW_HOURS = 2;
const TEST_PRODUCT_ID = 'test-product';
const TEST_SESSION_ID = 'test-session';
const TEST_EMAIL = 'test@example.com';
const TEST_NPUB = 'npub1test';

describe('subscription-lock queries', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	describe('getSubscriptionsToRemindViaEmail', () => {
		it('should return subscription approaching expiration when first purchased', async () => {
			const now = new Date();
			const reminderWindow = addHours(now, REMINDER_WINDOW_HOURS);

			// Create subscription expiring in 1 hour (within reminder window)
			const subscriptionId = crypto.randomUUID();
			await collections.paidSubscriptions.insertOne({
				_id: subscriptionId,
				productId: TEST_PRODUCT_ID,
				number: 1,
				user: {
					sessionId: TEST_SESSION_ID,
					email: TEST_EMAIL
				},
				paidUntil: addHours(now, 1),
				notifications: [],
				createdAt: now,
				updatedAt: now
			});

			// Should return subscription for reminder
			const result = await getSubscriptionsToRemindViaEmail(now, reminderWindow).toArray();
			expect(result).toHaveLength(1);
			expect(result[0]._id).toBe(subscriptionId);

			// Should NOT return for end notification (not expired yet)
			const endResult = await getSubscriptionsToNotifyEndViaEmail(now).toArray();
			expect(endResult).toHaveLength(0);
		});

		it('should return subscription for end notification when expired', async () => {
			const now = new Date();

			// Create subscription that expired 1 hour ago
			const subscriptionId = crypto.randomUUID();
			await collections.paidSubscriptions.insertOne({
				_id: subscriptionId,
				productId: TEST_PRODUCT_ID,
				number: 1,
				user: {
					sessionId: TEST_SESSION_ID,
					email: TEST_EMAIL
				},
				paidUntil: subDays(now, 1),
				notifications: [],
				createdAt: subDays(now, 30),
				updatedAt: now
			});

			// Should return for end notification
			const endResult = await getSubscriptionsToNotifyEndViaEmail(now).toArray();
			expect(endResult).toHaveLength(1);
			expect(endResult[0]._id).toBe(subscriptionId);

			// Should NOT return for reminder (already expired)
			const reminderWindow = addHours(now, REMINDER_WINDOW_HOURS);
			const reminderResult = await getSubscriptionsToRemindViaEmail(now, reminderWindow).toArray();
			expect(reminderResult).toHaveLength(0);
		});

		it('should return renewed subscription for reminder when renewal approaching expiration', async () => {
			const now = new Date();
			const reminderWindow = addHours(now, REMINDER_WINDOW_HOURS);
			const oldPaidUntil = subDays(now, 5);

			// Create subscription with reminder already sent for old period
			const subscriptionId = crypto.randomUUID();
			const oldNotificationId = new (await import('mongodb')).ObjectId();
			await collections.paidSubscriptions.insertOne({
				_id: subscriptionId,
				productId: TEST_PRODUCT_ID,
				number: 1,
				user: {
					sessionId: TEST_SESSION_ID,
					email: TEST_EMAIL
				},
				paidUntil: oldPaidUntil,
				notifications: [
					{
						type: 'reminder' as const,
						medium: 'email' as const,
						createdAt: subDays(now, 6),
						_id: oldNotificationId
					}
				],
				createdAt: subDays(now, 35),
				updatedAt: subDays(now, 5)
			});

			// Simulate renewal: archive old notifications and update paidUntil
			const subscription = await collections.paidSubscriptions.findOne({ _id: subscriptionId });
			if (!subscription) {
				throw new Error('Subscription not found');
			}

			const archivedNotifications = subscription.notifications.map((notif) => ({
				...notif,
				forPaidUntil: oldPaidUntil
			}));

			await collections.paidSubscriptions.updateOne(
				{ _id: subscriptionId },
				{
					$set: {
						paidUntil: addHours(now, 1),
						updatedAt: now,
						notifications: []
					},
					$push: {
						notificationHistory: { $each: archivedNotifications }
					}
				}
			);

			// After renewal, should return for reminder again
			const result = await getSubscriptionsToRemindViaEmail(now, reminderWindow).toArray();
			expect(result).toHaveLength(1);
			expect(result[0]._id).toBe(subscriptionId);

			// Verify notification history was preserved
			const updated = await collections.paidSubscriptions.findOne({ _id: subscriptionId });
			expect(updated?.notifications).toHaveLength(0);
			expect(updated?.notificationHistory).toHaveLength(1);
			expect(updated?.notificationHistory?.[0]).toMatchObject({
				type: 'reminder',
				medium: 'email',
				forPaidUntil: oldPaidUntil
			});
		});

		it('should return renewed subscription for end notification when renewal expired', async () => {
			const now = new Date();
			const oldPaidUntil = subDays(now, 35);

			// Create subscription with previous reminder/expiration notifications
			const subscriptionId = crypto.randomUUID();
			await collections.paidSubscriptions.insertOne({
				_id: subscriptionId,
				productId: TEST_PRODUCT_ID,
				number: 1,
				user: {
					sessionId: TEST_SESSION_ID,
					email: TEST_EMAIL
				},
				paidUntil: oldPaidUntil,
				notifications: [
					{
						type: 'reminder' as const,
						medium: 'email' as const,
						createdAt: subDays(now, 36),
						_id: new (await import('mongodb')).ObjectId()
					},
					{
						type: 'expiration' as const,
						medium: 'email' as const,
						createdAt: subDays(now, 35),
						_id: new (await import('mongodb')).ObjectId()
					}
				],
				createdAt: subDays(now, 65),
				updatedAt: subDays(now, 35)
			});

			// Simulate renewal: archive old notifications and extend paidUntil to yesterday
			const subscription = await collections.paidSubscriptions.findOne({ _id: subscriptionId });
			if (!subscription) {
				throw new Error('Subscription not found');
			}

			const archivedNotifications = subscription.notifications.map((notif) => ({
				...notif,
				forPaidUntil: oldPaidUntil
			}));

			await collections.paidSubscriptions.updateOne(
				{ _id: subscriptionId },
				{
					$set: {
						paidUntil: subDays(now, 1),
						updatedAt: now,
						notifications: []
					},
					$push: {
						notificationHistory: { $each: archivedNotifications }
					}
				}
			);

			// After renewal expiration, should return for end notification
			const endResult = await getSubscriptionsToNotifyEndViaEmail(now).toArray();
			expect(endResult).toHaveLength(1);
			expect(endResult[0]._id).toBe(subscriptionId);

			// Verify notification history was preserved (2 notifications from old period)
			const updated = await collections.paidSubscriptions.findOne({ _id: subscriptionId });
			expect(updated?.notifications).toHaveLength(0);
			expect(updated?.notificationHistory).toHaveLength(2);
			expect(updated?.notificationHistory?.[0].type).toBe('reminder');
			expect(updated?.notificationHistory?.[1].type).toBe('expiration');
			expect(updated?.notificationHistory?.[0].forPaidUntil).toEqual(oldPaidUntil);
		});

		it('should not return subscription if reminder already sent', async () => {
			const now = new Date();
			const reminderWindow = addHours(now, REMINDER_WINDOW_HOURS);

			// Create subscription with reminder already sent
			const subscriptionId = crypto.randomUUID();
			await collections.paidSubscriptions.insertOne({
				_id: subscriptionId,
				productId: TEST_PRODUCT_ID,
				number: 1,
				user: {
					sessionId: TEST_SESSION_ID,
					email: TEST_EMAIL
				},
				paidUntil: addHours(now, 1),
				notifications: [
					{
						type: 'reminder' as const,
						medium: 'email' as const,
						createdAt: subDays(now, 1),
						_id: new (await import('mongodb')).ObjectId()
					}
				],
				createdAt: subDays(now, 30),
				updatedAt: now
			});

			// Should NOT return (reminder already sent)
			const result = await getSubscriptionsToRemindViaEmail(now, reminderWindow).toArray();
			expect(result).toHaveLength(0);
		});

		it('should not return subscription if expiration already sent', async () => {
			const now = new Date();

			// Create expired subscription with expiration notification already sent
			const subscriptionId = crypto.randomUUID();
			await collections.paidSubscriptions.insertOne({
				_id: subscriptionId,
				productId: TEST_PRODUCT_ID,
				number: 1,
				user: {
					sessionId: TEST_SESSION_ID,
					email: TEST_EMAIL
				},
				paidUntil: subDays(now, 1),
				notifications: [
					{
						type: 'expiration' as const,
						medium: 'email' as const,
						createdAt: subDays(now, 1),
						_id: new (await import('mongodb')).ObjectId()
					}
				],
				createdAt: subDays(now, 30),
				updatedAt: now
			});

			// Should NOT return (expiration already sent)
			const result = await getSubscriptionsToNotifyEndViaEmail(now).toArray();
			expect(result).toHaveLength(0);
		});

		it('should not return cancelled subscriptions', async () => {
			const now = new Date();
			const reminderWindow = addHours(now, REMINDER_WINDOW_HOURS);

			// Create cancelled subscription approaching expiration
			const subscriptionId = crypto.randomUUID();
			await collections.paidSubscriptions.insertOne({
				_id: subscriptionId,
				productId: TEST_PRODUCT_ID,
				number: 1,
				user: {
					sessionId: TEST_SESSION_ID,
					email: TEST_EMAIL
				},
				paidUntil: addHours(now, 1),
				notifications: [],
				cancelledAt: now,
				createdAt: subDays(now, 30),
				updatedAt: now
			});

			// Should NOT return (subscription is cancelled)
			const reminderResult = await getSubscriptionsToRemindViaEmail(now, reminderWindow).toArray();
			expect(reminderResult).toHaveLength(0);

			// Should also NOT return for end notification
			const endResult = await getSubscriptionsToNotifyEndViaEmail(now).toArray();
			expect(endResult).toHaveLength(0);
		});

		it('should only return subscriptions with email, not nostr-only', async () => {
			const now = new Date();
			const reminderWindow = addHours(now, REMINDER_WINDOW_HOURS);

			// Create subscription with npub but no email
			const subscriptionId1 = crypto.randomUUID();
			await collections.paidSubscriptions.insertOne({
				_id: subscriptionId1,
				productId: TEST_PRODUCT_ID,
				number: 1,
				user: {
					sessionId: TEST_SESSION_ID,
					npub: TEST_NPUB
				},
				paidUntil: addHours(now, 1),
				notifications: [],
				createdAt: subDays(now, 30),
				updatedAt: now
			});

			// Create subscription with email
			const subscriptionId2 = crypto.randomUUID();
			await collections.paidSubscriptions.insertOne({
				_id: subscriptionId2,
				productId: TEST_PRODUCT_ID,
				number: 2,
				user: {
					sessionId: 'test-session-2',
					email: TEST_EMAIL
				},
				paidUntil: addHours(now, 1),
				notifications: [],
				createdAt: subDays(now, 30),
				updatedAt: now
			});

			// Should only return email subscription
			const emailResult = await getSubscriptionsToRemindViaEmail(now, reminderWindow).toArray();
			expect(emailResult).toHaveLength(1);
			expect(emailResult[0]._id).toBe(subscriptionId2);

			// Nostr query should only return npub subscription
			const nostrResult = await getSubscriptionsToRemindViaNostr(now, reminderWindow).toArray();
			expect(nostrResult).toHaveLength(1);
			expect(nostrResult[0]._id).toBe(subscriptionId1);
		});
	});
});
