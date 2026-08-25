import { collections } from '$lib/server/database.js';
import { locales, type LanguageKey } from '$lib/translations/index.js';
import type { JsonObject } from 'type-fest';
import { mapObject } from '$lib/utils/mapObject.js';
import { z } from 'zod';
import { labelTranslatableSchema } from '../label-schema';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async function ({ request, params }) {
		const json: JsonObject = {};

		for (const [key, value] of await request.formData()) {
			if (value) {
				json[key] = String(value);
			}
		}

		const parsed = z
			.object({
				language: z.enum(locales as [LanguageKey, ...LanguageKey[]]),
				...mapObject(labelTranslatableSchema, (x) => x.optional())
			})
			.parse(json);
		const { language, ...rest } = parsed;
		await collections.labels.updateOne(
			{
				_id: params.id
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
