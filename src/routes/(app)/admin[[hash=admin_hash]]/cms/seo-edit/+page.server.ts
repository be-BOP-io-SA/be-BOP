import { collections } from '$lib/server/database';
import type { CMSPage } from '$lib/types/CmsPage';
import { MAX_SHORT_DESCRIPTION_LIMIT } from '$lib/types/Product';
import { set } from '$lib/utils/set';
import { redirect } from '@sveltejs/kit';
import type { JsonObject } from 'type-fest';
import { z } from 'zod';

export const load = async () => {
	const cmsPages = await collections.cmsPages
		.find({})
		.project<Pick<CMSPage, '_id' | 'title' | 'shortDescription'>>({
			_id: 1,
			title: 1,
			shortDescription: 1
		})
		.toArray();

	return {
		cmsPages
	};
};

export const actions = {
	default: async function ({ request }) {
		const formData = await request.formData();

		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		for (const [key, value] of Object.entries(json)) {
			const { title, shortDescription } = z
				.object({
					title: z.string().trim().max(MAX_SHORT_DESCRIPTION_LIMIT).optional(),
					shortDescription: z.string().trim().optional()
				})
				.parse(value);

			await collections.cmsPages.updateOne(
				{ _id: key },
				{
					$set: {
						title: title ?? '',
						shortDescription: shortDescription ?? '',
						updatedAt: new Date()
					}
				}
			);
		}
		throw redirect(303, request.headers.get('referer') || '/admin/cms/seo-edit');
	}
};
