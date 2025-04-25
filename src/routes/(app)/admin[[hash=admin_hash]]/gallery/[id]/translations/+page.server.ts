import { collections } from '$lib/server/database.js';
import { locales, type LanguageKey } from '$lib/translations/index.js';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';
import { mapObject } from '$lib/utils/mapObject.js';
import { galleryTranslatableSchema } from '../gallery-schema';

export const actions = {
	default: async function ({ request, params }) {
		const json: JsonObject = {};
		for (const [key, value] of await request.formData()) {
			if (value) {
				set(json, key, value);
			}
		}
		const parsed = z
			.object({
				language: z.enum(locales as [LanguageKey, ...LanguageKey[]]),
				...mapObject(galleryTranslatableSchema, (x) => x.optional())
			})
			.parse(json);

		await collections.galleries.updateOne(
			{
				_id: params.id
			},
			{
				$set: {
					[`translations.${parsed.language}`]: parsed,
					updatedAt: new Date()
				}
			}
		);
	}
};
