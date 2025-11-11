import type { ChangeStream, ChangeStreamDocument } from 'mongodb';
import { Lock } from '../lock';
import { collections } from '../database';
import type { EmailNotification } from '$lib/types/EmailNotification';
import { isEmailConfigured, sendEmail } from '../email';
import { building } from '$app/environment';
import { rateLimit } from '../rateLimit';

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

let changeStream: ChangeStream<EmailNotification>;

function watch() {
	try {
		rateLimit('0.0.0.0', 'changeStream.email-notifications', 10, { minutes: 5 });
	} catch {
		console.error("Too many change streams errors for 'email-notifications', exiting");
		process.exit(1);
	}
	changeStream = collections.emailNotifications.watch([{ $match: { operationType: 'insert' } }], {
		fullDocument: 'updateLookup'
	});
	changeStream.on('change', (ev) => handleChanges(ev).catch(console.error));
	changeStream.on('error', (err) => {
		console.error('email-notifications', err);
		changeStream.close().catch(console.error);
		watch();
	});
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
