import type { LocalesDictionary } from '$lib/i18n.js';
import { collections } from '$lib/server/database.js';
import { parse, type ParseError } from 'jsonc-parser';
import { runtimeConfig } from '$lib/server/runtime-config';
import { locales, type LanguageKey } from '$lib/translations';
import { typedEntries } from '$lib/utils/typedEntries.js';
import { typedFromEntries } from '$lib/utils/typedFromEntries.js';
import { z } from 'zod';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		defaultLanguage: runtimeConfig.defaultLanguage,
		customTranslationKeys: runtimeConfig.languages.map((locale) => ({
			locale: locale,
			keys: runtimeConfig[`translations.${locale}`] || {}
		}))
	};
};

export const actions: Actions = {
	languages: async ({ request }) => {
		const formData = await request.formData();

		const parsed = z
			.object({
				languages: z.array(z.enum([locales[0], ...locales.slice(1)])).min(1),
				defaultLanguage: z.enum([locales[0], ...locales.slice(1)])
			})
			.parse({
				languages: formData.getAll('languages'),
				defaultLanguage: formData.get('defaultLanguage')
			});

		if (!parsed.languages.includes(parsed.defaultLanguage)) {
			throw error(400, 'Default language must be one of the selected languages');
		}

		if (JSON.stringify(runtimeConfig.languages) !== JSON.stringify(parsed.languages)) {
			runtimeConfig.languages = parsed.languages;
			await collections.runtimeConfig.updateOne(
				{
					_id: 'languages'
				},
				{
					$set: {
						data: parsed.languages,
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
		}

		if (runtimeConfig.defaultLanguage !== parsed.defaultLanguage) {
			runtimeConfig.defaultLanguage = parsed.defaultLanguage;
			await collections.runtimeConfig.updateOne(
				{
					_id: 'defaultLanguage'
				},
				{
					$set: {
						data: parsed.defaultLanguage,
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
		}
	},
	custom: async ({ request }) => {
		const formData = await request.formData();

		const parsed = z
			.object(
				typedFromEntries(
					runtimeConfig.languages.map((locale) => [
						locale,
						z.record(
							z
								.string()
								.or(
									z.record(
										z
											.string()
											.or(z.record(z.string().or(z.record(z.string().or(z.record(z.string()))))))
									)
								)
						)
					])
				)
			)
			.parse(
				typedFromEntries(
					locales.map((locale) => {
						const errors: ParseError[] = [];
						const result = parse(String(formData.get(locale)) || 'invalid', errors, {
							allowTrailingComma: true,
							disallowComments: false
						});

						if (errors.length) {
							throw error(
								400,
								`Invalid JSON: ${errors[0].error} for language ${locale} at offset ${errors[0].offset}, length: ${errors[0].length}`
							);
						}
						return [locale, result] as const;
					})
				)
			) as Record<string, LocalesDictionary>;

		for (const [locale, keys] of typedEntries(parsed)) {
			if (
				JSON.stringify(runtimeConfig[`translations.${locale as LanguageKey}`] || {}) !==
				JSON.stringify(keys)
			) {
				runtimeConfig[`translations.${locale as LanguageKey}`] = keys;
				await collections.runtimeConfig.updateOne(
					{
						_id: `translations.${locale as LanguageKey}`
					},
					{
						$set: {
							data: keys,
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
			}
		}
	}
};
