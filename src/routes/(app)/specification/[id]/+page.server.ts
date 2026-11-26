import { collections } from '$lib/server/database';
import type { Specification } from '$lib/types/Specification.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const specification = (await collections.specifications.findOne(
		{ _id: params.id },
		{
			projection: {
				title: { $ifNull: [`$translations.${locals.language}.title`, '$title'] },
				content: { $ifNull: [`$translations.${locals.language}.content`, '$content'] }
			}
		}
	)) as Pick<Specification, 'title' | 'content'> | null;

	if (!specification) {
		throw error(404, 'specification not found');
	}

	return {
		specification
	};
};
