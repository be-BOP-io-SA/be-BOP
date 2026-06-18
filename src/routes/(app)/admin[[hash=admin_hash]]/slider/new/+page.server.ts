import { collections } from '$lib/server/database';
import { generatePicture } from '$lib/server/picture';
import type { Actions, PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { MAX_NAME_LIMIT } from '$lib/types/Product';
import { zodSlug } from '$lib/server/zod';

export const load: PageServerLoad = async () => {};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();

		const parsed = z
			.object({
				slug: zodSlug(),
				title: z.string().trim().min(1).max(MAX_NAME_LIMIT),
				sliderPictureId: z.string().trim().min(1).max(500)
			})
			.parse(Object.fromEntries(formData));

		if (await collections.sliders.countDocuments({ _id: parsed.slug })) {
			throw error(409, 'Slider with same slug already exists');
		}

		await generatePicture(parsed.sliderPictureId, {
			slider: { _id: parsed.slug },
			cb: async (session) => {
				await collections.sliders.insertOne(
					{
						_id: parsed.slug,
						createdAt: new Date(),
						updatedAt: new Date(),
						title: parsed.title
					},
					{ session }
				);
			}
		});

		throw redirect(303, '/admin/slider/' + parsed.slug);
	}
};
