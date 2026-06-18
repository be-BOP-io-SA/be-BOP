import { collections } from '$lib/server/database';
import type { Specification } from '$lib/types/Specification';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	return {
		specifications: collections.specifications
			.find({})
			.project<Pick<Specification, '_id' | 'title'>>({
				_id: 1,
				title: 1
			})
			.sort({ updatedAt: -1 })
			.toArray()
	};
};
