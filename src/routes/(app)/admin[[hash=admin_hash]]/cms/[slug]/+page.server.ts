import { adminPrefix } from '$lib/server/admin.js';
import { collections } from '$lib/server/database';
import type { JsonObject } from 'type-fest';
import { cmsTranslatableSchema } from './cms-schema';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { set } from 'lodash-es';

export const actions = {
	update: async function ({ request, params }) {
		const cmsPage = await collections.cmsPages.findOne({
			_id: params.slug
		});

		if (!cmsPage) {
			throw error(404, 'Page not found');
		}

		const formData = await request.formData();
		const json: JsonObject = {};

		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const {
			title,
			content,
			shortDescription,
			fullScreen,
			maintenanceDisplay,
			hideFromSEO,
			hasMobileContent,
			mobileContent,
			hasEmployeeContent,
			employeeContent,
			metas
		} = z
			.object({
				...cmsTranslatableSchema,
				fullScreen: z.boolean({ coerce: true }),
				maintenanceDisplay: z.boolean({ coerce: true }),
				hideFromSEO: z.boolean({ coerce: true }),
				desktopDisplayOnly: z.boolean({ coerce: true }),
				hasMobileContent: z.boolean({ coerce: true }),
				hasEmployeeContent: z.boolean({ coerce: true }),
				metas: z
					.array(
						z.object({
							content: z.string().trim(),
							name: z.string().trim()
						})
					)
					.optional()
					.default([])
			})
			.parse(json);

		await collections.cmsPages.updateOne(
			{
				_id: cmsPage._id
			},
			{
				$set: {
					title,
					content,
					shortDescription,
					fullScreen,
					maintenanceDisplay,
					hideFromSEO,
					hasMobileContent,
					...(hasMobileContent && { mobileContent }),
					hasEmployeeContent,
					...(hasEmployeeContent && { employeeContent }),
					...(metas.length && { metas: metas.filter((meta) => meta.name && meta.content) }),
					updatedAt: new Date()
				},
				$unset: {
					...(!metas.length && { metas: '' })
				}
			}
		);
	},

	delete: async function ({ params }) {
		await collections.cmsPages.deleteOne({
			_id: params.slug
		});

		throw redirect(303, `${adminPrefix()}/cms`);
	}
};
