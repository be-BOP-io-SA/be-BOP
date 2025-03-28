import { error } from '@sveltejs/kit';
import { collections } from '$lib/server/database';
import type { Challenge } from '$lib/types/Challenge';

export const load = async ({ params, locals }) => {
	const challenge = await collections.challenges.findOne<
		Pick<Challenge, '_id' | 'name' | 'goal' | 'progress' | 'endsAt' | 'mode' | 'beginsAt'>
	>(
		{ _id: params.id },
		{
			projection: {
				_id: 1,
				name: locals.language ? { $ifNull: [`$translations.${locals.language}.name`, '$name'] } : 1,
				goal: 1,
				progress: 1,
				endsAt: 1,
				beginsAt: 1,
				mode: 1
			}
		}
	);

	if (!challenge) {
		throw error(404, 'Challenge not found');
	}

	return {
		challenge
	};
};
