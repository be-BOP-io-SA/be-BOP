import { runtimeConfig } from '$lib/server/runtime-config';
import { locales, type LanguageKey } from '$lib/translations';
import { typedFromEntries } from '$lib/utils/typedFromEntries';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';
import { layoutTranslatableSchema } from '../layout-schema';
import { collections } from '$lib/server/database';

export async function load() {
	return {
		config: typedFromEntries(
			locales.map((locale) => [locale, runtimeConfig[`translations.${locale}.config`]] as const)
		),
		defaultConfig: {
			brandName: runtimeConfig.brandName,
			topbarLinks: runtimeConfig.topbarLinks,
			navbarLinks: runtimeConfig.navbarLinks,
			footerLinks: runtimeConfig.footerLinks,
			websiteTitle: runtimeConfig.websiteTitle,
			websiteShortDescription: runtimeConfig.websiteShortDescription
		}
	};
}

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const json: JsonObject = {};

		for (const [key, value] of formData) {
			if (value) {
				set(json, key, value);
			}
		}

		const parsed = z
			.object({
				language: z.enum(locales as [LanguageKey, ...LanguageKey[]]),
				...layoutTranslatableSchema
			})
			.parse(json);

		const { language, ...rest } = parsed;

		await collections.runtimeConfig.updateOne(
			{
				_id: `translations.${language}.config`
			},
			{
				$set: {
					data: rest,
					updatedAt: new Date()
				},
				$setOnInsert: {
					createdAt: new Date()
				}
			},
			{
				upsert: true
			}
		);

		runtimeConfig[`translations.${language}.config`] = rest;
	}
};
