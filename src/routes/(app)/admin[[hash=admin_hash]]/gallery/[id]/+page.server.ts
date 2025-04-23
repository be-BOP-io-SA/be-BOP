import { collections } from '$lib/server/database';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { z } from 'zod';
import { MAX_NAME_LIMIT } from '$lib/types/Product';
import type { JsonObject } from 'type-fest';
import { set } from '$lib/utils/set';
import { adminPrefix } from '$lib/server/admin';
import { deletePicture, generatePicture } from '$lib/server/picture';
import { zodSlug } from '$lib/server/zod';

export const load = async ({ params }) => {
	const pictures = await collections.pictures
		.find({ galleryId: params.id })
		.sort({ createdAt: 1 })
		.toArray();

	return {
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
		const gallery = await collections.galleries.findOne({ _id: params.id });

		if (!gallery) {
			throw error(404, 'gallery not found');
		}
		const parsed = z
			.object({
				slug: zodSlug(),
				name: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				principal: z.object({
					title: z.string(),
					content: z.string().trim().max(10_000),
					cta: z.object({ href: z.string().trim(), label: z.string().trim() })
				}),
				secondary: z
					.array(
						z.object({
							title: z.string().trim().max(30),
							content: z.string().trim().max(160),
							pictureId: z.string().trim().max(100),
							cta: z.object({ href: z.string().trim(), label: z.string().trim() })
						})
					)
					.optional()
					.default([])
			})
			.parse(json);
		await Promise.all(
			parsed.secondary.map(async (sec) => {
				if (
					sec.pictureId &&
					!gallery.secondary.find((secondGallery) => secondGallery.pictureId === sec.pictureId)
				) {
					await generatePicture(sec.pictureId, {
						galleryId: parsed.slug
					});
				}
			})
		);
		await collections.galleries.updateOne(
			{
				_id: params.id
			},
			{
				$set: {
					updatedAt: new Date(),
					name: parsed.name,
					principal: parsed.principal,
					secondary: parsed.secondary?.filter(
						(secondary) => secondary.cta.label && secondary.cta.href
					),
					[`translations.fr.secondary`]: gallery.translations?.fr?.secondary?.map(
						(secondary, i) => ({
							...secondary,
							pictureId: parsed.secondary[i].pictureId
						})
					),
					[`translations.en.secondary`]: gallery.translations?.en?.secondary?.map(
						(secondary, i) => ({
							...secondary,
							pictureId: parsed.secondary[i].pictureId
						})
					)
				}
			}
		);

		throw redirect(303, `${adminPrefix()}/gallery/${params.id}`);
	},

	delete: async ({ params }) => {
		for await (const picture of collections.pictures.find({ galleryId: params.id })) {
			await deletePicture(picture._id);
		}
		await collections.galleries.deleteOne({ _id: params.id });

		throw redirect(303, `${adminPrefix()}/gallery`);
	}
};
