import { MongoServerError, Timestamp, type ChangeStream, type ChangeStreamDocument } from 'mongodb';
import { Lock } from '../lock';
import { collections } from '../database';
import type { EmailNotification } from '$lib/types/EmailNotification';
import { isEmailConfigured, sendEmail } from '../email';
import { building } from '$app/environment';
import { rateLimit } from '../rateLimit';
import { getUnixTime, subHours } from 'date-fns';
import { typedInclude } from '$lib/utils/typedIncludes';

const lock = new Lock('notifications.email');

async function handleChanges(change: ChangeStreamDocument<EmailNotification>): Promise<void> {
	if (!isEmailConfigured()) {
		return;
	}

	if (!lock?.ownsLock || !('fullDocument' in change) || !change.fullDocument) {
		return;
	}

	await handleEmailNotification(change.fullDocument);
}

const processingIds = new Set<string>();

async function handleEmailNotification(email: EmailNotification): Promise<void> {
	if (email.processedAt || processingIds.has(email._id.toString())) {
		return;
	}

	try {
		processingIds.add(email._id.toString());

		const updatedEmail = await collections.emailNotifications.findOne({
			_id: email._id
		});
		if (!updatedEmail || updatedEmail.processedAt) {
			return;
		}
		email = updatedEmail;

		try {
			await sendEmail({
				to: email.dest,
				subject: email.subject,
				html: email.htmlContent,
				...(email.bcc && { bcc: email.bcc })
			});
		} catch (err) {
			console.error('Send mail error', err);
			collections.emailNotifications
				.updateOne({ _id: email._id }, { $set: { error: err as Error } })
				.catch(console.error);
		}

		await collections.emailNotifications.updateOne(
			{ _id: email._id },
			{
				$set: {
					processedAt: new Date(),
					updatedAt: new Date()
				}
			}
		);
	} finally {
		processingIds.delete(email._id.toString());
	}
}

let changeStream: ChangeStream<EmailNotification> | null = null;

async function watch(opts?: { requestChangesSince?: Timestamp }) {
	try {
		rateLimit('0.0.0.0', 'changeStream.email-notifications', 10, { minutes: 5 });
	} catch {
		console.error("Too many change streams errors for 'email-notifications', exiting");
		process.exit(1);
	}

	try {
		changeStream = collections.emailNotifications
			.watch([{ $match: { operationType: 'insert' } }], {
				fullDocument: 'updateLookup',
				...(opts?.requestChangesSince && {
					startAtOperationTime: opts.requestChangesSince
				})
			})
			.on('change', (ev) => handleChanges(ev).catch(console.error))
			.once('error', async (err) => {
				console.error('change stream error', err);
				changeStream?.close().catch(console.error);
				changeStream = null;

				if (
					err instanceof MongoServerError &&
					typedInclude(['ChangeStreamHistoryLost', 'ChangeStreamFatalError'], err.codeName)
				) {
					// Restart from 1 hour ago if history was lost
					return watch({
						requestChangesSince: Timestamp.fromBits(0, getUnixTime(subHours(new Date(), 1)))
					});
				} else {
					return watch();
				}
			});

		return changeStream;
	} catch (err) {
		if (err instanceof MongoServerError && err.codeName === 'ChangeStreamHistoryLost') {
			console.warn('Oplog time out of range when starting change stream, falling back to now', err);
			return watch();
		}
		throw err;
	}
}

async function processEmailNotifications() {
	if (!isEmailConfigured()) {
		return;
	}

	const docs = collections.emailNotifications.find({
		processedAt: { $exists: false }
	});

	for await (const doc of docs) {
		await handleEmailNotification(doc);
	}
}

if (!building) {
	watch();

	if (lock) {
		lock.onAcquire = async () => {
			await processEmailNotifications();
		};
	}
}
