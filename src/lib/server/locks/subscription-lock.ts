import { addSeconds, formatDistance } from 'date-fns';
import { collections, withTransaction } from '../database';
import { Lock } from '../lock';
import { processClosed } from '../process';
import { setTimeout } from 'node:timers/promises';
import { refreshPromise, runtimeConfig } from '../runtime-config';
import { type FindCursor, ObjectId } from 'mongodb';
import { ORIGIN } from '$lib/server/env-config';
import { Kind } from 'nostr-tools';
import { queueEmail } from '../email';
import type { PaidSubscription } from '$lib/types/PaidSubscription';

const lock = new Lock('paid-subscriptions');

export function getSubscriptionsToRemindViaNostr(
	now: Date,
	reminderWindow: Date
): FindCursor<PaidSubscription> {
	return collections.paidSubscriptions.find({
		paidUntil: {
			$gt: now,
			$lt: reminderWindow
		},
		cancelledAt: { $exists: false },
		'user.npub': { $exists: true },
		notifications: { $not: { $elemMatch: { type: 'reminder', medium: 'nostr' } } }
	});
}

export function getSubscriptionsToRemindViaEmail(
	now: Date,
	reminderWindow: Date
): FindCursor<PaidSubscription> {
	return collections.paidSubscriptions.find({
		paidUntil: {
			$gt: now,
			$lt: reminderWindow
		},
		cancelledAt: { $exists: false },
		'user.email': { $exists: true },
		notifications: { $not: { $elemMatch: { type: 'reminder', medium: 'email' } } }
	});
}

export function getSubscriptionsToNotifyEndViaNostr(now: Date): FindCursor<PaidSubscription> {
	return collections.paidSubscriptions.find({
		paidUntil: {
			$lt: now
		},
		cancelledAt: { $exists: false },
		'user.npub': { $exists: true },
		notifications: { $not: { $elemMatch: { type: 'expiration', medium: 'nostr' } } }
	});
}

export function getSubscriptionsToNotifyEndViaEmail(now: Date): FindCursor<PaidSubscription> {
	return collections.paidSubscriptions.find({
		paidUntil: {
			$lt: now
		},
		cancelledAt: { $exists: false },
		'user.email': { $exists: true },
		notifications: { $not: { $elemMatch: { type: 'expiration', medium: 'email' } } }
	});
}

async function notifySubscriptionReminderViaNostr(subscription: PaidSubscription) {
	const userNpub = subscription.user.npub;
	if (!userNpub) {
		console.log(
			`Cannot send subscription reminder via Nostr: subscription ${subscription._id} - user has no npub`
		);
		return;
	}

	await withTransaction(async (session) => {
		const notifId = new ObjectId();
		await collections.nostrNotifications.insertOne(
			{
				_id: notifId,
				kind: Kind.EncryptedDirectMessage,
				dest: userNpub,
				content: `Your subscription #${subscription.number} is going to expire ${formatDistance(
					subscription.paidUntil,
					new Date(),
					{
						addSuffix: true
					}
				)}. Renew here: ${ORIGIN}/subscription/${subscription._id}`,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ session }
		);

		await collections.paidSubscriptions.updateOne(
			{
				_id: subscription._id
			},
			{
				$push: {
					notifications: {
						createdAt: new Date(),
						_id: notifId,
						type: 'reminder',
						medium: 'nostr'
					}
				}
			},
			{ session }
		);
	}).catch(console.error);
}

async function notifySubscriptionReminderViaEmail(subscription: PaidSubscription) {
	const userEmail = subscription.user.email;
	if (!userEmail) {
		console.log(
			`Cannot send subscription reminder email: subscription ${subscription._id} - user has no email`
		);
		return;
	}

	await withTransaction(async (session) => {
		const notifId = new ObjectId();

		await queueEmail(
			userEmail,
			'subscription.reminder',
			{
				subscriptionNumber: subscription.number.toString(),
				expirationTime: formatDistance(subscription.paidUntil, new Date(), {
					addSuffix: true
				}),
				subscriptionLink: `${ORIGIN}/subscription/${subscription._id}`
			},
			{ session }
		);

		await collections.paidSubscriptions.updateOne(
			{
				_id: subscription._id
			},
			{
				$push: {
					notifications: {
						createdAt: new Date(),
						_id: notifId,
						type: 'reminder',
						medium: 'email'
					}
				}
			},
			{ session }
		);
	}).catch(console.error);
}

async function notifySubscriptionEndedViaNostr(subscription: PaidSubscription) {
	const userNpub = subscription.user.npub;
	if (!userNpub) {
		console.log(
			`Cannot send subscription ended notification via Nostr: subscription ${subscription._id} - user has no npub`
		);
		return;
	}

	await withTransaction(async (session) => {
		const notifId = new ObjectId();
		await collections.nostrNotifications.insertOne(
			{
				_id: notifId,
				kind: Kind.EncryptedDirectMessage,
				dest: userNpub,
				content: `Your subscription #${subscription.number} expired. Renew here if you wish: ${ORIGIN}/subscription/${subscription._id}`,
				createdAt: new Date(),
				updatedAt: new Date()
			},
			{ session }
		);
		await collections.paidSubscriptions.updateOne(
			{
				_id: subscription._id
			},
			{
				$push: {
					notifications: {
						createdAt: new Date(),
						_id: notifId,
						type: 'expiration',
						medium: 'nostr'
					}
				}
			},
			{ session }
		);
	}).catch(console.error);
}

async function notifySubscriptionEndedViaEmail(subscription: PaidSubscription) {
	const userEmail = subscription.user.email;
	if (!userEmail) {
		console.log(
			`Cannot send subscription ended email: subscription ${subscription._id} - user has no email`
		);
		return;
	}

	await withTransaction(async (session) => {
		const notifId = new ObjectId();

		await queueEmail(
			userEmail,
			'subscription.ended',
			{
				subscriptionNumber: subscription.number.toString(),
				subscriptionLink: `${ORIGIN}/subscription/${subscription._id}`
			},
			{ session }
		);

		await collections.paidSubscriptions.updateOne(
			{
				_id: subscription._id
			},
			{
				$push: {
					notifications: {
						createdAt: new Date(),
						_id: notifId,
						type: 'expiration',
						medium: 'email'
					}
				}
			},
			{ session }
		);
	}).catch(console.error);
}

async function maintainLock() {
	await refreshPromise;

	while (!processClosed) {
		if (!lock.ownsLock) {
			await setTimeout(5_000);
			continue;
		}

		try {
			const now = new Date();
			const reminderWindow = addSeconds(now, runtimeConfig.subscriptionReminderSeconds);

			const subscriptionsToRemindNostr = getSubscriptionsToRemindViaNostr(now, reminderWindow);
			for await (const subscription of subscriptionsToRemindNostr) {
				await notifySubscriptionReminderViaNostr(subscription);
			}

			const subscriptionsToRemindEmail = getSubscriptionsToRemindViaEmail(now, reminderWindow);
			for await (const subscription of subscriptionsToRemindEmail) {
				await notifySubscriptionReminderViaEmail(subscription);
			}
		} catch (err) {
			console.error(err);
		}

		try {
			const now = new Date();
			const subscriptionsToNotifyEndNostr = getSubscriptionsToNotifyEndViaNostr(now);
			for await (const subscription of subscriptionsToNotifyEndNostr) {
				await notifySubscriptionEndedViaNostr(subscription);
			}

			const subscriptionsToNotifyEndEmail = getSubscriptionsToNotifyEndViaEmail(now);
			for await (const subscription of subscriptionsToNotifyEndEmail) {
				await notifySubscriptionEndedViaEmail(subscription);
			}
		} catch (err) {
			console.error(err);
		}

		await setTimeout(5_000);
	}
}

maintainLock();
