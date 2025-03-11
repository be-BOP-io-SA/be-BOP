import { locales, type LanguageKey } from '$lib/translations/index.js';
import { mapObject } from '$lib/utils/mapObject.js';
import { z } from 'zod';
import { productBaseSchema } from '../../product-schema.js';
import { pick, set } from 'lodash-es';
import type { ProductTranslatableFields } from '$lib/types/Product.js';
import { collections } from '$lib/server/database.js';
import type { JsonObject } from 'type-fest';

export const actions = {
	default: async function ({ request, params }) {
		const json: JsonObject = {};

		for (const [key, value] of await request.formData()) {
			if (value) {
				set(json, key, value);
			}
		}

		const keys = [
			'customPreorderText',
			'name',
			'shortDescription',
			'description',
			'contentAfter',
			'contentBefore'
		] satisfies (keyof ProductTranslatableFields)[];

		const parsed = z
			.object({
				language: z.enum(locales as [LanguageKey, ...LanguageKey[]]),
				...mapObject(pick(productBaseSchema(), keys), (val) => val.optional()),
				cta: productBaseSchema().cta.optional(),
				externalResources: productBaseSchema().externalResources.optional(),
				variationLabels: z
					.object({
						names: z.record(z.string().trim(), z.string().trim()),
						values: z.record(z.string().trim(), z.record(z.string().trim(), z.string().trim()))
					})
					.optional(),
				sellDisclaimer: z
					.object({
						title: productBaseSchema().sellDisclaimerTitle.optional(),
						reason: productBaseSchema().sellDisclaimerReason.optional()
					})
					.optional()
			})
			.parse(json);

		const { language, ...rest } = parsed;

		if (rest.cta) {
			rest.cta = rest.cta.filter((ctaLink) => ctaLink.label && ctaLink.href);
		}

		if (rest.externalResources) {
			rest.externalResources = rest.externalResources.filter(
				(externalResourceLink) => externalResourceLink.label && externalResourceLink.href
			);
		}

		await collections.products.updateOne(
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
