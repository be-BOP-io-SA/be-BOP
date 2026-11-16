import { collections } from '$lib/server/database.js';
import { defaultConfig, runtimeConfig, type EmailTemplateKey } from '$lib/server/runtime-config';
import { typedKeys } from '$lib/utils/typedKeys.js';
import { z } from 'zod';

export async function load() {
	return {
		defaultTemplates: defaultConfig.emailTemplates,
		templates: runtimeConfig.emailTemplates
	};
}

export const actions = {
	update: async function ({ request }) {
		const parsed = z
			.object({
				key: z.enum(
					typedKeys(defaultConfig.emailTemplates) as [EmailTemplateKey, ...EmailTemplateKey[]]
				),
				subject: z.string().trim(),
				html: z.string().trim()
			})
			.parse(Object.fromEntries(await request.formData()));

		if (!parsed.subject) {
			parsed.subject = defaultConfig.emailTemplates[parsed.key].subject;
		}
		if (!parsed.html) {
			parsed.html = defaultConfig.emailTemplates[parsed.key].html;
		}

		runtimeConfig.emailTemplates[parsed.key] = {
			subject: parsed.subject,
			html: parsed.html,
			default:
				parsed.subject === defaultConfig.emailTemplates[parsed.key].subject &&
				parsed.html === defaultConfig.emailTemplates[parsed.key].html
		};

		await collections.runtimeConfig.updateOne(
			{ _id: `emailTemplates` },
			{
				$set: { data: runtimeConfig.emailTemplates, updatedAt: new Date() },
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);
	},
	reset: async function ({ request }) {
		const parsed = z
			.object({
				key: z.enum(
					typedKeys(defaultConfig.emailTemplates) as [EmailTemplateKey, ...EmailTemplateKey[]]
				)
			})
			.parse(Object.fromEntries(await request.formData()));

		runtimeConfig.emailTemplates[parsed.key] = defaultConfig.emailTemplates[parsed.key];

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
