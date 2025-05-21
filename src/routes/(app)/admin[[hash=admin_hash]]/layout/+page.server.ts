import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { z } from 'zod';
import type { JsonObject } from 'type-fest';
import { layoutTranslatableSchema } from './layout-schema';
import { typedKeys } from '$lib/utils/typedKeys';
import { deepEquals } from '$lib/utils/deep-equals';
import { set } from '$lib/utils/set';

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const res = z
			.object({
				usersDarkDefaultTheme: z.boolean({ coerce: true }),
				employeesDarkDefaultTheme: z.boolean({ coerce: true }),
				...layoutTranslatableSchema,
				socialNetworkIcons: z
					.array(
						z.object({ name: z.string().trim(), svg: z.string().trim(), href: z.string().trim() })
					)
					.default([]),
				displayPoweredBy: z.boolean({ coerce: true }),
				displayCompanyInfo: z.boolean({ coerce: true }),
				displayMainShopInfo: z.boolean({ coerce: true }),
				viewportContentWidth: z.number({ coerce: true }),
				disableZoomProductPicture: z.boolean({ coerce: true }),
				viewportFor: z.enum(['no-one', 'employee', 'visitors', 'everyone']).optional(),
				hideCmsZonesOnMobile: z.boolean({ coerce: true }),
				visitorDarkLightMode: z.enum(['light', 'dark', 'system']),
				employeeDarkLightMode: z.enum(['light', 'dark', 'system'])
			})
			.parse(json);

		for (const linkKey of ['topbarLinks', 'navbarLinks', 'footerLinks'] as const) {
			res[linkKey] = res[linkKey]?.filter((item) => item.href && item.label) ?? [];
		}
		res.socialNetworkIcons = res.socialNetworkIcons?.filter(
			(item) => item.href && item.svg && item.name
		);

		for (const key of typedKeys(res)) {
			if (!deepEquals(runtimeConfig[key], res[key])) {
				runtimeConfig[key] = res[key] as never;
				await collections.runtimeConfig.updateOne(
					{ _id: key },
					{
						$set: { data: res[key], updatedAt: new Date() },
						$setOnInsert: { createdAt: new Date() }
					},
					{ upsert: true }
				);
			}
		}
	}
};
