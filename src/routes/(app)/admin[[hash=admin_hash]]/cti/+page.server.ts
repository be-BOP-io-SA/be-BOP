import { runtimeConfig } from '$lib/server/runtime-config';
import type { JsonObject } from 'type-fest';
import type { Actions } from './$types';
import { set } from '$lib/utils/set';
import { z } from 'zod';
import { collections } from '$lib/server/database';
import { adminPrefix } from '$lib/server/admin';
import { redirect } from '@sveltejs/kit';
import { generatePicture } from '$lib/server/picture';
import { CMSPage } from '$lib/types/CmsPage';

export async function load() {
	const pictures = await collections.pictures
		.find({ ctiCategorySlug: { $exists: true } }) // Checks if the field exists
		.sort({ createdAt: 1 })
		.toArray();
	const cmsPages = collections.cmsPages
		.find({})
		.project<Pick<CMSPage, '_id'>>({
			_id: 1
		})
		.toArray();
	return {
		enableCustomerTouchInterface: runtimeConfig.enableCustomerTouchInterface,
		cti: runtimeConfig.customerTouchInterface,
		pictures,
		cmsPages
	};
}

export const actions: Actions = {
	update: async ({ request }) => {
		const formData = await request.formData();
		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}

		const categorySchema = z.object({
			slug: z.string(),
			cmsSlug: z.string(),
			label: z.string(),
			isArchived: z.boolean({ coerce: true }),
			position: z.coerce.number().default(0)
		});
		const parsed = z
			.object({
				enableCustomerLogin: z.boolean({ coerce: true }),
				welcomeCmsSlug: z.string().optional(),
				categories: z.array(categorySchema).optional()
			})
			.parse(json);
		const parsedCti = z
			.object({
				enableCustomerTouchInterface: z.boolean({ coerce: true })
			})
			.parse(json);
		const parsedPicture = z
			.object({
				categoryPictures: z.string().trim().min(1).max(500).array().min(1).optional()
			})
			.parse(json);
		const oldCategorySlug = new Set(
			runtimeConfig.customerTouchInterface?.categories?.map((category) => category.slug) || []
		);
		const newCategorySlug = parsed.categories
			? parsed.categories.filter((category) => !oldCategorySlug.has(category.slug))
			: [];

		if (parsedPicture.categoryPictures && newCategorySlug.length) {
			await Promise.all(
				parsedPicture.categoryPictures.map(async (categoryPicture, index) => {
					await generatePicture(categoryPicture, {
						ctiCategorySlug: newCategorySlug[index].slug
					});
				})
			);
		}
		await collections.runtimeConfig.updateOne(
			{
				_id: 'enableCustomerTouchInterface'
			},
			{
				$set: {
					data: parsedCti.enableCustomerTouchInterface,
					updatedAt: new Date()
				}
			},
			{
				upsert: true
			}
		);
		runtimeConfig.enableCustomerTouchInterface = parsedCti.enableCustomerTouchInterface;

		if (parsedCti.enableCustomerTouchInterface) {
			await collections.runtimeConfig.updateOne(
				{
					_id: 'customerTouchInterface'
				},
				{
					$set: {
						data: parsed,
						updatedAt: new Date()
					}
				},
				{
					upsert: true
				}
			);
			runtimeConfig.customerTouchInterface = parsed;
		}

		throw redirect(303, `${adminPrefix()}/cti`);
	}
};
