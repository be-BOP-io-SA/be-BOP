import { adminPrefix } from '$lib/server/admin.js';
import { collections } from '$lib/server/database';
import { zodSlug } from '$lib/server/zod.js';
import { MAX_CONTENT_LIMIT } from '$lib/types/CmsPage';
import { MAX_NAME_LIMIT, MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
import { error, redirect } from '@sveltejs/kit';
import { set } from 'lodash-es';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}
		const {
			slug,
			title,
			content,
			shortDescription,
			fullScreen,
			maintenanceDisplay,
			hasMobileContent,
			mobileContent,
			hasEmployeeContent,
			employeeContent,
			metas
		} = z
			.object({
				slug: zodSlug(),
				title: z.string().min(1).max(MAX_NAME_LIMIT),
				content: z.string().max(MAX_CONTENT_LIMIT),
				shortDescription: z.string().max(MAX_SHORT_DESCRIPTION_LIMIT),
				fullScreen: z.boolean({ coerce: true }),
				maintenanceDisplay: z.boolean({ coerce: true }),
				hasMobileContent: z.boolean({ coerce: true }),
				mobileContent: z.string().max(MAX_CONTENT_LIMIT).optional(),
				hasEmployeeContent: z.boolean({ coerce: true }),
				employeeContent: z.string().max(MAX_CONTENT_LIMIT).optional(),
				metas: z
					.array(z.object({ name: z.string().trim(), content: z.string().trim() }))
					.optional()
					.default([])
			})
			.parse(json);

		if (slug === 'catalog') {
			throw error(409, 'Page with same slug already exists');
		}

		const existing = await collections.cmsPages.countDocuments({ _id: slug });

		if (existing) {
			throw error(409, 'Page with same slug already exists');
		}

		await collections.cmsPages.insertOne({
			_id: slug,
			title,
			content,
			shortDescription,
			fullScreen,
			maintenanceDisplay,
			hasMobileContent,
			...(hasMobileContent && mobileContent && { mobileContent }),
			hasEmployeeContent,
			...(hasEmployeeContent && employeeContent && { employeeContent }),
			...(metas.length && { metas: metas.filter((meta) => meta.name && meta.content) }),
			createdAt: new Date(),
			updatedAt: new Date()
		});

		throw redirect(303, `${adminPrefix()}/cms/${slug}`);
	}
};
