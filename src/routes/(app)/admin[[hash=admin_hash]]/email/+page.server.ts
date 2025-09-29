import { collections } from '$lib/server/database';
import { defaultConfig, EmailTemplateKey, runtimeConfig } from '$lib/server/runtime-config';
import type { EmailNotification } from '$lib/types/EmailNotification';
import { set } from '$lib/utils/set';
import { typedKeys } from '$lib/utils/typedKeys';
import { ObjectId } from 'mongodb';
import type { JsonObject } from 'type-fest';
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
			Object.entries(runtimeConfig.emailTemplates).filter(([key]) => key.startsWith('order'))
		),
		orderEmailTemplatesDefault: Object.fromEntries(
			Object.entries(defaultConfig.emailTemplates).filter(([key]) => key.startsWith('order'))
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
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}
		const parsed = z
			.object({
				emailTemplates: z.array(
					z.object({
						key: z.enum(
							typedKeys(runtimeConfig.emailTemplates) as [EmailTemplateKey, ...EmailTemplateKey[]]
						),
						sendToUser: z.boolean({ coerce: true }),
						sendCopyToAdmin: z.boolean({ coerce: true })
					})
				)
			})
			.parse(json);
		for (const emailTemplate of parsed.emailTemplates) {
			runtimeConfig.emailTemplates[emailTemplate.key] = {
				subject: runtimeConfig.emailTemplates[emailTemplate.key].subject,
				html: runtimeConfig.emailTemplates[emailTemplate.key].html,
				default:
					defaultConfig.emailTemplates[emailTemplate.key].subject ===
						runtimeConfig.emailTemplates[emailTemplate.key].subject &&
					defaultConfig.emailTemplates[emailTemplate.key].html ===
						runtimeConfig.emailTemplates[emailTemplate.key].html,
				sendToUser: emailTemplate.sendToUser,
				sendCopyToAdmin: result.copyOrderEmailsToAdmin || emailTemplate.sendCopyToAdmin
			};
		}

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
