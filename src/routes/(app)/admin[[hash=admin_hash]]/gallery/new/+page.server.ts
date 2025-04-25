import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { set } from '$lib/utils/set';
import { MAX_NAME_LIMIT } from '$lib/types/Product';
import type { JsonObject } from 'type-fest';
import { adminPrefix } from '$lib/server/admin';
import { generatePicture } from '$lib/server/picture';
import { zodSlug } from '$lib/server/zod';

export const load = async () => {};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const json: JsonObject = {};
		for (const [key, value] of formData) {
			set(json, key, value);
		}
		const parsed = z
			.object({
				slug: zodSlug(),
				name: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				principal: z.object({
					title: z.string(),
					content: z.string().trim().max(10_000),
					cta: z.object({
						href: z.string().trim(),
						label: z.string().trim(),
						openNewTab: z.boolean({ coerce: true }).default(false)
					})
				}),
				secondary: z
					.array(
						z.object({
							title: z.string().trim().max(30),
							content: z.string().trim().max(160),
							pictureId: z.string().trim().max(500),
							cta: z.object({
								href: z.string().trim(),
								label: z.string().trim(),
								openNewTab: z.boolean({ coerce: true }).default(false)
							})
						})
					)
					.optional()
					.default([])
			})
			.parse(json);

		await Promise.all(
			parsed.secondary.map(async (sec) => {
				if (sec.pictureId) {
					await generatePicture(sec.pictureId, {
						galleryId: parsed.slug
					});
				}
			})
		);
		if (await collections.galleries.countDocuments({ _id: parsed.slug })) {
			throw error(409, 'gallery with same slug already exists');
		}

		await collections.galleries.insertOne({
			_id: parsed.slug,
			createdAt: new Date(),
			updatedAt: new Date(),
			name: parsed.name,
			principal: parsed.principal,
			secondary: parsed.secondary?.filter((secondary) => secondary.cta.label && secondary.cta.href)
		});
		throw redirect(303, `${adminPrefix()}/gallery/${parsed.slug}`);
	}
};
