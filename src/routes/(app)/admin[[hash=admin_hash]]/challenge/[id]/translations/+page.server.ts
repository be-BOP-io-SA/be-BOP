import type { JsonObject } from 'type-fest';
import { mapObject } from '$lib/utils/mapObject.js';
import { z } from 'zod';
import { locales, type LanguageKey } from '$lib/translations/index.js';
import { collections } from '$lib/server/database.js';
import { MAX_NAME_LIMIT } from '$lib/types/Product';

export const actions = {
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
				...mapObject(
					{
						name: z.string().min(1).max(MAX_NAME_LIMIT)
					},
					(x) => x.optional()
				)
			})
			.parse(json);

		const { language, ...rest } = parsed;

		await collections.challenges.updateOne(
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
