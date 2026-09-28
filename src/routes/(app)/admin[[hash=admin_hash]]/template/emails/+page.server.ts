import { collections } from '$lib/server/database.js';
import { defaultConfig, runtimeConfig, type EmailTemplateKey } from '$lib/server/runtime-config';
import { typedKeys } from '$lib/utils/typedKeys.js';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { error } from '@sveltejs/kit';
import { z } from 'zod';

// These templates carry a login credential (reset or session link): whoever edits one can read it
// in the /admin/email log or through a remote image, and so takes over the account it is sent to.
const CREDENTIAL_TEMPLATE_KEYS: EmailTemplateKey[] = ['passwordReset', 'temporarySessionRequest'];

export async function load() {
	return {
		defaultTemplates: defaultConfig.emailTemplates,
		templates: runtimeConfig.emailTemplates
	};
}

export const actions = {
	update: async function ({ request, locals }) {
		const parsed = z
			.object({
				key: z.enum(
					typedKeys(defaultConfig.emailTemplates) as [EmailTemplateKey, ...EmailTemplateKey[]]
				),
				subject: z.string().trim(),
				html: z.string().trim()
			})
			.parse(Object.fromEntries(await request.formData()));

		if (
			CREDENTIAL_TEMPLATE_KEYS.includes(parsed.key) &&
			locals.user?.roleId !== SUPER_ADMIN_ROLE_ID
		) {
			throw error(403, 'Only Super Admin can edit this template');
		}

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
