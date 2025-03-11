import { collections } from '$lib/server/database';

export const load = async () => {
	const leaderboards = await collections.leaderboards.find({}).sort({ updatedAt: -1 }).toArray();

	return {
		leaderboards
	};
};
