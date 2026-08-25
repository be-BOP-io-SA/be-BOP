import { error } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import type { Countdown } from '$lib/types/Countdown';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const countdown = await collections.countdowns.findOne<
		Pick<Countdown, '_id' | 'title' | 'description' | 'endsAt'>
	>(
		{ _id: params.id },
		{
			projection: {
				_id: 1,
				title: {
					$ifNull: [`$translations.${locals.language}.title`, '$title']
				},
				description: { $ifNull: [`$translations.${locals.language}.description`, '$description'] },
				endsAt: 1
			}
		}
	);

	if (!countdown) {
		throw error(404, 'Countdown not found');
	}

	return {
		countdown
	};
};
