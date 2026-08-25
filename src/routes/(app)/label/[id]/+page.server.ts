import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const label = await collections.labels.findOne(
		{ _id: params.id },
		{
			projection: {
				name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] },
				color: 1,
				icon: 1
			}
		}
	);

	if (!label) {
		throw error(404, 'label not found');
	}

	return {
		label
	};
};
