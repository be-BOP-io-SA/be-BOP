import { collections } from '$lib/server/database';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const discounts = await collections.discounts.find({}).toArray();

	return {
		discounts
	};
};
