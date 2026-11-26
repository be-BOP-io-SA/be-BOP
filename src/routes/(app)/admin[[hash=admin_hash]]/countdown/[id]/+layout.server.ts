import { collections } from '$lib/server/database';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const countdown = await collections.countdowns.findOne({ _id: params.id });

	if (!countdown) {
		throw error(404, 'countdown not found');
	}
	return {
		countdown
	};
};
