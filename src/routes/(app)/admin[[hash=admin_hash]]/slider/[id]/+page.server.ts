import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { MAX_NAME_LIMIT } from '$lib/types/Product';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';
import { deletePicture } from '$lib/server/picture';

export const load = async ({ params }) => {
	const slider = await collections.sliders.findOne({ _id: params.id });

	if (!slider) {
		throw error(404, 'slider not found');
	}
	const pictures = await collections.pictures
		.find({ 'slider._id': params.id })
		.sort({ createdAt: 1 })
		.toArray();

	return {
		slider,
		pictures
	};
};

export const actions: Actions = {
	update: async ({ request, params }) => {
		const formData = await request.formData();
		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}
		const parsed = z
			.object({
				title: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				slideLinks: z
					.array(
						z.object({
							idPicture: z.string().trim(),
							href: z.string().trim(),
							newTab: z.boolean({ coerce: true }).default(false)
						})
					)
					.optional()
					.default([])
			})
			.parse(json);
		await Promise.all(
			parsed.slideLinks.map(async (slideLink) => {
				await collections.pictures.updateOne(
					{
						_id: slideLink.idPicture
					},
					{
						$set: {
							createdAt: new Date(),
							updatedAt: new Date(),
							slider: {
								_id: params.id,
								url: slideLink.href,
								openNewTab: slideLink.newTab
							}
						}
					}
				);
			})
		);
		await collections.sliders.updateOne(
			{
				_id: params.id
			},
			{
				$set: {
					createdAt: new Date(),
					updatedAt: new Date(),
					title: parsed.title
				}
			}
		);

		throw redirect(303, '/admin/slider/' + params.id);
	},
	// Todo: disable in production
	delete: async ({ params }) => {
		for await (const picture of collections.pictures.find({ 'slider._id': params.id })) {
			await deletePicture(picture._id);
		}
		await collections.sliders.deleteOne({ _id: params.id });

		throw redirect(303, '/admin/slider');
	}
};
