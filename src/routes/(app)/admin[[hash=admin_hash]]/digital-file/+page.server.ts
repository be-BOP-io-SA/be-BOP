import { collections } from '$lib/server/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		files: await collections.digitalFiles.find({ productId: { $exists: false } }).toArray()
	};
};
