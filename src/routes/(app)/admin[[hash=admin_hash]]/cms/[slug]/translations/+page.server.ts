import type { JsonObject } from 'type-fest';
import { cmsTranslatableSchema } from '../cms-schema.js';
import { mapObject } from '$lib/utils/mapObject.js';
import { z } from 'zod';
import { locales, type LanguageKey } from '$lib/translations/index.js';
import { collections } from '$lib/server/database.js';
import { error } from '@sveltejs/kit';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';

export const actions = {
	default: async function ({ request, params, locals }) {
		const cmsPage = await collections.cmsPages.findOne(
			{ _id: params.slug },
			{ projection: { displayRawContent: 1 } }
		);

		if (!cmsPage) {
			throw error(404, 'Page not found');
		}

		// Translations of a raw page are rendered unsanitized like its main content.
		if (cmsPage.displayRawContent && locals.user?.roleId !== SUPER_ADMIN_ROLE_ID) {
			throw error(403, 'Only the super admin can edit a page that displays raw content.');
		}

		const json: JsonObject = {};

		for (const [key, value] of await request.formData()) {
			if (value) {
				json[key] = String(value);
			}
		}

		const parsed = z
			.object({
				language: z.enum(locales as [LanguageKey, ...LanguageKey[]]),
				...mapObject(cmsTranslatableSchema, (x) => x.optional())
			})
			.parse(json);

		const { language, ...rest } = parsed;

		await collections.cmsPages.updateOne(
			{
				_id: params.slug
			},
			{
				$set: {
					[`translations.${language}`]: rest,
					updatedAt: new Date()
				}
			}
		);
	}
};
