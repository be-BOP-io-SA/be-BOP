import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';

export const load = async ({ params }) => {
	const countdown = await collections.countdowns.findOne({ _id: params.id });

	if (!countdown) {
		throw error(404, 'countdown not found');
	}
	return {
		countdown,
		beginsAt: countdown.beginsAt?.toJSON().slice(0, 10),
		endsAt: countdown.endsAt.toJSON().slice(0, 10)
	};
};
