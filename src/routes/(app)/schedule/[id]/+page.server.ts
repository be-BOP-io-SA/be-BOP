import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import { hideRsvpTargets } from '$lib/server/schedule';

export const load = async ({ params }) => {
	const schedule = await collections.schedules.findOne({ _id: params.id });

	if (!schedule) {
		throw error(404, 'schedule not found');
	}
	const pictures = await collections.pictures
		.find({ 'schedule._id': params.id })
		.sort({ createdAt: 1 })
		.toArray();
	return {
		schedule: hideRsvpTargets(schedule),
		pictures
	};
};
