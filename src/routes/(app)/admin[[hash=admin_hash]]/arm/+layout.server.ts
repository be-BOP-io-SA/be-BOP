import { collections } from '$lib/server/database';

export const load = async () => {
	return {
		roles: await collections.roles.find().sort({ createdAt: 1 }).toArray()
	};
};
