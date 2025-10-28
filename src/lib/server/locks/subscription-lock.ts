import { addSeconds, formatDistance } from 'date-fns';
import { collections, withTransaction } from '../database';
import { Lock } from '../lock';
import { processClosed } from '../process';
import { setTimeout } from 'node:timers/promises';
import { refreshPromise, runtimeConfig } from '../runtime-config';
import { ObjectId } from 'mongodb';
import { ORIGIN } from '$lib/server/env-config';
import { Kind } from 'nostr-tools';
import { queueEmail } from '../email';

const lock = new Lock('paid-subscriptions');

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

			const subscriptionsToRemindNostr = collections.paidSubscriptions.find({
				paidUntil: {
					$gt: now,
					$lt: reminderWindow
				},
				cancelledAt: { $exists: false },
				'user.npub': { $exists: true },
				notifications: { $not: { $elemMatch: { type: 'reminder', medium: 'nostr' } } }
			});

			for await (const subscription of subscriptionsToRemindNostr) {
				await withTransaction(async (session) => {
					const notifId = new ObjectId();
					await collections.nostrNotifications.insertOne(
						{
							_id: notifId,
							kind: Kind.EncryptedDirectMessage,
							dest: subscription.user.npub,
							content: `Your subscription #${
								subscription.number
							} is going to expire ${formatDistance(subscription.paidUntil, new Date(), {
								addSuffix: true
							})}. Renew here: ${ORIGIN}/subscription/${subscription._id}`,
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

			const subscriptionsToRemindEmail = collections.paidSubscriptions.find({
				paidUntil: {
					$gt: now,
					$lt: reminderWindow
				},
				cancelledAt: { $exists: false },
				'user.email': { $exists: true },
				notifications: { $not: { $elemMatch: { type: 'reminder', medium: 'email' } } }
			});

			for await (const subscription of subscriptionsToRemindEmail) {
				const userEmail = subscription.user.email;
				if (!userEmail) {
					continue;
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
		} catch (err) {
			console.error(err);
		}

		try {
			const subscriptionsToNotifyEndNostr = collections.paidSubscriptions.find({
				paidUntil: {
					$lt: new Date()
				},
				cancelledAt: { $exists: false },
				'user.npub': { $exists: true },
				notifications: { $not: { $elemMatch: { type: 'expiration', medium: 'nostr' } } }
			});

			for await (const subscription of subscriptionsToNotifyEndNostr) {
				await withTransaction(async (session) => {
					const notifId = new ObjectId();
					await collections.nostrNotifications.insertOne(
						{
							_id: notifId,
							kind: Kind.EncryptedDirectMessage,
							dest: subscription.user.npub,
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

			const subscriptionsToNotifyEndEmail = collections.paidSubscriptions.find({
				paidUntil: {
					$lt: new Date()
				},
				cancelledAt: { $exists: false },
				'user.email': { $exists: true },
				notifications: { $not: { $elemMatch: { type: 'expiration', medium: 'email' } } }
			});

			for await (const subscription of subscriptionsToNotifyEndEmail) {
				const userEmail = subscription.user.email;
				if (!userEmail) {
					continue;
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
		} catch (err) {
			console.error(err);
		}

		await setTimeout(5_000);
	}
}

maintainLock();
