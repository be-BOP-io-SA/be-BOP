import { collections } from '$lib/server/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const sliders = await collections.sliders.find({}).toArray();
	return {
		sliders
	};
};

export const actions = {};
