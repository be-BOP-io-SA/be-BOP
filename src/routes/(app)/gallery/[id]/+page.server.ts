import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const gallery = await collections.galleries.findOne(
		{ _id: params.id },
		{
			projection: {
				principal: { $ifNull: [`$translations.${locals.language}.principal`, '$principal'] },
				secondary: { $ifNull: [`$translations.${locals.language}.secondary`, '$secondary'] }
			}
		}
	);

	if (!gallery) {
		throw error(404, 'gallery not found');
	}
	const pictures = await collections.pictures
		.find({ galleryId: params.id })
		.sort({ createdAt: 1 })
		.toArray();

	return {
		gallery,
		pictures
	};
};
