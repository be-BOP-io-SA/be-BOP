import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { set } from '$lib/utils/set';
import { MAX_NAME_LIMIT } from '$lib/types/Product';
import type { JsonObject } from 'type-fest';
import { generatePicture } from '$lib/server/picture';
import type { TagType } from '$lib/types/Picture';
import { adminPrefix } from '$lib/server/admin';
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
				content: z.string().trim().max(10_000),
				shortContent: z.string().trim().max(1_000),
				family: z.enum(['creators', 'events', 'retailers', 'temporal']),
				widgetUseOnly: z.boolean({ coerce: true }).default(false),
				productTagging: z.boolean({ coerce: true }).default(false),
				useLightDark: z.boolean({ coerce: true }).default(false),
				reportingFilter: z.boolean({ coerce: true }).default(false),
				title: z.string(),
				subtitle: z.string(),
				mainPictureId: z.string().trim().max(500),
				fullPictureId: z.string().trim().max(500),
				wideBannerId: z.string().trim().max(500),
				slimBannerId: z.string().trim().max(500),
				avatarId: z.string().trim().max(500),
				cta: z
					.array(
						z.object({
							href: z.string().trim(),
							label: z.string().trim(),
							openNewTab: z.boolean({ coerce: true }).default(false)
						})
					)
					.optional()
					.default([]),
				menu: z
					.array(z.object({ href: z.string().trim(), label: z.string().trim() }))
					.optional()
					.default([]),
				cssOverride: z.string().trim().max(10_000)
			})
			.parse(json);

		if (await collections.tags.countDocuments({ _id: parsed.slug })) {
			throw error(409, 'tag with same slug already exists');
		}
		const tagPictures = [
			{ id: parsed.mainPictureId, type: 'main' as TagType },
			{ id: parsed.fullPictureId, type: 'full' as TagType },
			{ id: parsed.wideBannerId, type: 'wide' as TagType },
			{ id: parsed.slimBannerId, type: 'slim' as TagType },
			{ id: parsed.avatarId, type: 'avatar' as TagType }
		];
		const tagPicturesFiltred = tagPictures.filter((picture) => picture.id);

		await Promise.all(
			tagPicturesFiltred.map(async (tagPicture) => {
				await generatePicture(tagPicture.id, {
					tag: { _id: parsed.slug, type: tagPicture.type }
				});
			})
		);

		await collections.tags.insertOne({
			_id: parsed.slug,
			createdAt: new Date(),
			updatedAt: new Date(),
			name: parsed.name,
			title: parsed.title,
			subtitle: parsed.subtitle,
			family: parsed.family,
			content: parsed.content,
			shortContent: parsed.shortContent,
			cssOveride: parsed.cssOverride,
			widgetUseOnly: parsed.widgetUseOnly,
			productTagging: parsed.productTagging,
			useLightDark: parsed.useLightDark,
			reportingFilter: parsed.reportingFilter,
			cta: parsed.cta?.filter((ctaLink) => ctaLink.label && ctaLink.href),
			menu: parsed.menu?.filter((menuLink) => menuLink.label && menuLink.href)
		});
		throw redirect(303, `${adminPrefix()}/tags/${parsed.slug}`);
	}
};
