import { collections } from '$lib/server/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const leaderboards = await collections.leaderboards.find({}).sort({ updatedAt: -1 }).toArray();

	return {
		leaderboards
	};
};
