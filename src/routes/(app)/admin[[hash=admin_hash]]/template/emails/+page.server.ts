import { collections } from '$lib/server/database.js';
import { defaultConfig, runtimeConfig, type EmailTemplateKey } from '$lib/server/runtime-config';
import { typedKeys } from '$lib/utils/typedKeys.js';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User.js';
import { CREDENTIAL_TEMPLATE_LINKS } from '$lib/server/credential-email-template';
import { error, fail } from '@sveltejs/kit';
import { z } from 'zod';

const CREDENTIAL_TEMPLATE_KEYS: EmailTemplateKey[] = typedKeys(CREDENTIAL_TEMPLATE_LINKS);

export async function load({ locals }) {
	return {
		defaultTemplates: defaultConfig.emailTemplates,
		templates: runtimeConfig.emailTemplates,
		resetTemplates: runtimeConfig.resetEmailTemplates,
		superAdminOnlyKeys: locals.user?.roleId === SUPER_ADMIN_ROLE_ID ? [] : CREDENTIAL_TEMPLATE_KEYS
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
			return fail(403, { ...parsed, superAdminOnly: true });
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
	dismissResetNotice: async function ({ request, locals }) {
		if (locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'Only Super Admin can edit this template');
		}
		const { key } = z
			.object({ key: z.string() })
			.parse(Object.fromEntries(await request.formData()));

		const kept = Object.fromEntries(
			Object.entries(runtimeConfig.resetEmailTemplates).filter(([reset]) => reset !== key)
		);
		runtimeConfig.resetEmailTemplates = kept;

		await collections.runtimeConfig.updateOne(
			{ _id: 'resetEmailTemplates' },
			{ $set: { data: kept, updatedAt: new Date() } }
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
