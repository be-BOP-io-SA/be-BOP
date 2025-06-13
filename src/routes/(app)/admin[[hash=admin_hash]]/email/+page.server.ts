import { collections } from '$lib/server/database';
import { defaultConfig, EmailTemplateKey, runtimeConfig } from '$lib/server/runtime-config';
import type { EmailNotification } from '$lib/types/EmailNotification';
import { typedKeys } from '$lib/utils/typedKeys';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

export async function load() {
	return {
		emails: collections.emailNotifications
			.find({})
			.project<Pick<EmailNotification, 'subject' | 'dest' | 'error' | 'processedAt'>>({
				subject: 1,
				dest: 1,
				error: 1,
				processedAt: 1,
				_id: 0
			})
			.sort({ _id: -1 })
			.limit(100)
			.toArray(),
		copyOrderEmailsToAdmin: runtimeConfig.copyOrderEmailsToAdmin,
		orderEmailTemplates: Object.fromEntries(
			Object.entries(runtimeConfig.emailTemplates).filter(
				([key]) =>
					key.startsWith('order') &&
					key !== 'order.update.leaderboard' &&
					key !== 'order.update.challenge'
			)
		)
	};
}

export const actions = {
	send: async function ({ request }) {
		const { to, subject, body } = z
			.object({
				to: z.string().email(),
				subject: z.string(),
				body: z.string()
			})
			.parse(Object.fromEntries(await request.formData()));

		await collections.emailNotifications.insertOne({
			_id: new ObjectId(),
			createdAt: new Date(),
			updatedAt: new Date(),
			subject,
			htmlContent: body,
			dest: to
		});

		return {
			success: true
		};
	},
	update: async function ({ request }) {
		const formData = await request.formData();
		const result = z
			.object({
				copyOrderEmailsToAdmin: z.boolean({ coerce: true })
			})
			.parse(Object.fromEntries(formData));

		await collections.runtimeConfig.updateOne(
			{ _id: 'copyOrderEmailsToAdmin' },
			{
				$set: { data: result.copyOrderEmailsToAdmin, updatedAt: new Date() },
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);
		runtimeConfig.copyOrderEmailsToAdmin = result.copyOrderEmailsToAdmin;
	},
	updateEmailCopy: async function ({ request }) {
		const formData = await request.formData();

		const parsed = z
			.object({
				key: z.enum(
					typedKeys(runtimeConfig.emailTemplates) as [EmailTemplateKey, ...EmailTemplateKey[]]
				),
				sendToUser: z.boolean({ coerce: true }),
				sendCopyToAdmin: z.boolean({ coerce: true })
			})
			.parse(Object.fromEntries(formData));

		runtimeConfig.emailTemplates[parsed.key] = {
			subject: runtimeConfig.emailTemplates[parsed.key].subject,
			html: runtimeConfig.emailTemplates[parsed.key].html,
			default:
				defaultConfig.emailTemplates[parsed.key].subject ===
					runtimeConfig.emailTemplates[parsed.key].subject &&
				defaultConfig.emailTemplates[parsed.key].html ===
					runtimeConfig.emailTemplates[parsed.key].html,
			sendToUser: parsed.sendToUser,
			sendCopyToAdmin: parsed.sendCopyToAdmin
		};

		await collections.runtimeConfig.updateOne(
			{ _id: `emailTemplates` },
			{
				$set: { data: runtimeConfig.emailTemplates, updatedAt: new Date() },
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);
	}
};
