import { collections } from '$lib/server/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const galleries = await collections.galleries.find({}).toArray();

	return {
		galleries
	};
};
