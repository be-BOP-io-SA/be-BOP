import { addSeconds, formatDistance } from 'date-fns';
import { collections, withTransaction } from '../database';
import { Lock } from '../lock';
import { processClosed } from '../process';
import { setTimeout } from 'node:timers/promises';
import { refreshPromise, runtimeConfig } from '../runtime-config';
import { ObjectId } from 'mongodb';
import { ORIGIN } from '$lib/server/env-config';
import { Kind } from 'nostr-tools';

const lock = new Lock('paid-subscriptions');

async function maintainLock() {
	await refreshPromise;

	while (!processClosed) {
		if (!lock.ownsLock) {
			await setTimeout(5_000);
			continue;
		}

		try {
			const subscriptionsToRemind = collections.paidSubscriptions.find({
				paidUntil: {
					$gt: new Date(),
					$lt: addSeconds(new Date(), runtimeConfig.subscriptionReminderSeconds)
				},
				cancelledAt: { $exists: false },
				'notifications.type': { $ne: 'reminder' }
			});

			for await (const subscription of subscriptionsToRemind) {
				await withTransaction(async (session) => {
					if (subscription.user.npub) {
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
					}
					if (subscription.user.email) {
						const notifId = new ObjectId();
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
										medium: 'none' // todo: switch to "email"
									}
								}
							},
							{ session }
						);
						// todo
					}
				}).catch(console.error);
			}
		} catch (err) {
			console.error(err);
		}

		try {
			const subscriptionsToNotifyEnd = collections.paidSubscriptions.find({
				paidUntil: {
					$lt: new Date()
				},
				cancelledAt: { $exists: false },
				'notifications.type': { $ne: 'expiration' }
			});

			for await (const subscription of subscriptionsToNotifyEnd) {
				await withTransaction(async (session) => {
					if (subscription.user.npub) {
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
					}
					if (subscription.user.email) {
						const notifId = new ObjectId();
						// todo: send email & store in DB
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
										medium: 'none' // todo: set to 'email'
									}
								}
							},
							{ session }
						);
					}
				}).catch(console.error);
			}
		} catch (err) {
			console.error(err);
		}

		await setTimeout(5_000);
	}
}

maintainLock();
