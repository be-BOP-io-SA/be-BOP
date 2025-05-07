import { Lock } from '$lib/server/lock';
import { getUnixTime, subDays, subMinutes } from 'date-fns';
import { collections } from '../database';
import { processClosed } from '../process';
import { setTimeout } from 'node:timers/promises';
import { s3client } from '../s3';
import { S3_BUCKET } from '$env/static/private';
import { ObjectId } from 'mongodb';

const lock = new Lock('cleanup');

async function cleanup() {
	while (!processClosed) {
		if (!lock.ownsLock) {
			await setTimeout(5_000);
			continue;
		}

		try {
			const expiredFiles = await collections.pendingDigitalFiles
				.find({
					createdAt: {
						// 1 day should be enough, 2 days to be sure
						$lt: subDays(new Date(), 2)
					}
				})
				.toArray();

			for (const file of expiredFiles) {
				await s3client
					.deleteObject({
						Bucket: S3_BUCKET,
						Key: file.storage.key
					})
					.catch();

				await collections.pendingDigitalFiles.deleteOne({
					_id: file._id
				});
			}
		} catch (err) {
			console.error(err);
		}

		try {
			const expiredPictures = await collections.pendingPictures
				.find({
					createdAt: {
						// 1 day should be enough, 2 days to be sure
						$lt: subDays(new Date(), 2)
					}
				})
				.toArray();

			for (const picture of expiredPictures) {
				await s3client
					.deleteObject({
						Bucket: S3_BUCKET,
						Key: picture.storage.original.key
					})
					.catch();

				for (const format of picture.storage.formats) {
					await s3client
						.deleteObject({
							Bucket: S3_BUCKET,
							Key: format.key
						})
						.catch();
				}

				await collections.pendingPictures.deleteOne({
					_id: picture._id
				});
			}
		} catch (err) {
			console.error(err);
		}

		try {
			const expiredSchedules = await collections.scheduleEvents
				.find({
					_id: {
						$lt: ObjectId.createFromTime(getUnixTime(subMinutes(new Date(), 5)))
					},
					orderId: { $exists: true },
					orderCreated: false,
					status: 'pending'
				})
				.toArray();

			for (const schedule of expiredSchedules) {
				if ((await collections.orders.countDocuments({ _id: schedule.orderId })) > 0) {
					await collections.scheduleEvents.updateOne(
						{
							_id: schedule._id
						},
						{
							$set: {
								orderCreated: true
							}
						}
					);
				} else {
					await collections.scheduleEvents.deleteOne({
						_id: schedule._id
					});
				}
			}
		} catch (err) {
			console.error('Error during cleanup schedules', err);
		}

		await setTimeout(5_000);
	}
}

cleanup();
