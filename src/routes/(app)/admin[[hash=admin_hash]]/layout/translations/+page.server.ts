import { runtimeConfig } from '$lib/server/runtime-config';
import { locales, type LanguageKey } from '$lib/translations';
import { typedFromEntries } from '$lib/utils/typedFromEntries';
import { set } from '$lib/utils/set';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';
import { layoutTranslatableSchema } from '../layout-schema';
import { collections } from '$lib/server/database';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
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
};

export const actions: Actions = {
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

		// Keep only rows the operator actually translated (label or href filled), each carrying its
		// stable `id`. Resolution matches overrides by id (`(app)/+layout.server.ts`), so sparse /
		// partial translations no longer need positional placeholders — untranslated rows are simply
		// dropped and fall back to the main config on the storefront.
		for (const linkKey of ['topbarLinks', 'navbarLinks', 'footerLinks'] as const) {
			const arr = rest[linkKey];
			if (arr) {
				rest[linkKey] = arr.filter((row) => row.id && (row.label || row.href));
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
