import { runtimeConfig } from '$lib/server/runtime-config';
import { locales, type LanguageKey } from '$lib/translations';
import { typedFromEntries } from '$lib/utils/typedFromEntries';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';
import { layoutTranslatableSchema } from '../layout-schema';
import { collections } from '$lib/server/database';
import { fail } from '@sveltejs/kit';

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

		// Always set, even empty values — link rows need both `label` and `href` present (even
		// blank) so the schema doesn't complain about missing keys on untranslated rows. Top-level
		// optional scalars (brandName / title / description) get their empty values stripped
		// below so their `.min(1)` constraint is only checked when the operator actually filled
		// the field in.
		for (const [key, value] of formData) {
			set(json, key, value);
		}
		for (const k of ['brandName', 'websiteTitle', 'websiteShortDescription'] as const) {
			if (json[k] === '') {
				delete json[k];
			}
		}

		const result = z
			.object({
				language: z.enum(locales as [LanguageKey, ...LanguageKey[]]),
				...layoutTranslatableSchema
			})
			.safeParse(json);

		if (!result.success) {
			const errorMessage = result.error.errors
				.map((e) => `${e.path.join('.') || '(root)'}: ${e.message}`)
				.join('; ');
			return fail(422, { errorMessage });
		}

		const { language, ...rest } = result.data;

		// Drop link rows where label or href is empty — covers untranslated rows whose URL was
		// pre-filled by the form but whose label stayed blank. Without this, the prefill would
		// silently persist the main URL as a per-language translation snapshot.
		for (const linkKey of ['topbarLinks', 'navbarLinks', 'footerLinks'] as const) {
			const arr = rest[linkKey];
			if (arr) {
				rest[linkKey] = arr.filter((row) => row.href && row.label);
			}
		}

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
		return { success: true };
	}
};
