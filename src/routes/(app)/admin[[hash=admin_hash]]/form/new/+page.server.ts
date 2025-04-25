import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { MAX_NAME_LIMIT } from '$lib/types/Product';
import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
import { adminPrefix } from '$lib/server/admin';
import { zodSlug } from '$lib/server/zod';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';

export const load = async () => {};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			if (value) {
				set(json, key, value);
			}
		}
		const parsed = z
			.object({
				slug: zodSlug(),
				title: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				target: z.string().trim().min(1).max(100),
				subject: z.string().trim().min(1).max(100),
				content: z.string().trim().max(MAX_CONTENT_LIMIT).default(''),
				displayFromField: z.boolean({ coerce: true }).default(false),
				prefillWithSession: z.boolean({ coerce: true }).default(false),
				disclaimer: z
					.object({
						label: z.string().min(1).max(100).trim(),
						content: z.string().min(1).max(MAX_CONTENT_LIMIT).trim(),
						checkboxLabel: z.string().min(1).max(100).trim()
					})
					.optional()
			})
			.parse(json);

		if (await collections.specifications.countDocuments({ _id: parsed.slug })) {
			throw error(409, 'Contact form with same slug already exists');
		}

		await collections.contactForms.insertOne({
			_id: parsed.slug,
			title: parsed.title,
			content: parsed.content,
			target: parsed.target,
			subject: parsed.subject,
			displayFromField: parsed.displayFromField,
			prefillWithSession: parsed.prefillWithSession,
			createdAt: new Date(),
			updatedAt: new Date(),
			...(parsed.disclaimer && { disclaimer: parsed.disclaimer })
		});

		throw redirect(303, `${adminPrefix()}/form/${parsed.slug}`);
	}
};
