import { collections } from '$lib/server/database';
import type { Actions } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { set } from 'lodash-es';
import { MAX_NAME_LIMIT } from '$lib/types/Product';
import type { JsonObject } from 'type-fest';
import { getS3DownloadLink, s3client } from '$lib/server/s3';
import { S3_BUCKET } from '$env/static/private';
import { generatePicture } from '$lib/server/picture';
import type { TagType } from '$lib/types/Picture';

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
				slug: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				name: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				content: z.string().trim().max(10_000),
				shortContent: z.string().trim().max(1_000),
				family: z.enum(['creators', 'events', 'retailers', 'temporal']),
				widgetUseOnly: z.boolean({ coerce: true }).default(false),
				productTagging: z.boolean({ coerce: true }).default(false),
				useLightDark: z.boolean({ coerce: true }).default(false),
				title: z.string(),
				subtitle: z.string(),
				mainPictureId: z.string().trim().min(1).max(500),
				fullPictureId: z.string().trim().min(1).max(500),
				wideBannerId: z.string().trim().min(1).max(500),
				slimBannerId: z.string().trim().min(1).max(500),
				avatarId: z.string().trim().min(1).max(500),
				ctaLinks: z
					.array(z.object({ href: z.string().trim(), label: z.string().trim() }))
					.optional()
					.default([]),
				menuLinks: z
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
		tagPictures.forEach(async (tagPicture) => {
			const pendingMainPicture = await collections.pendingPictures.findOne({
				_id: tagPicture.id
			});

			if (!pendingMainPicture) {
				throw error(400, 'Error when uploading picture');
			}

			const resp = await fetch(await getS3DownloadLink(pendingMainPicture.storage.original.key));

			if (!resp.ok) {
				throw error(400, 'Error when uploading picture');
			}

			const buffer = await resp.arrayBuffer();
			await generatePicture(Buffer.from(buffer), parsed.name, {
				tag: { _id: parsed.slug, type: tagPicture.type },
				cb: async (session) => {
					await s3client
						.deleteObject({
							Key: pendingMainPicture.storage.original.key,
							Bucket: S3_BUCKET
						})
						.catch();

					await collections.pendingPictures.deleteOne({ _id: tagPicture.id }, { session });
				}
			});
		});

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
			cta: parsed.ctaLinks?.filter((ctaLink) => ctaLink.label && ctaLink.href),
			menu: parsed.menuLinks?.filter((menuLink) => menuLink.label && menuLink.href)
		});
		throw redirect(303, '/admin/tags/' + parsed.slug);
	}
};
