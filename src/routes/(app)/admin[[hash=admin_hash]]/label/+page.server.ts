import { collections } from '$lib/server/database';
import type { OrderLabel } from '$lib/types/OrderLabel';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		labels: await collections.labels
			.find({})
			.project<Pick<OrderLabel, '_id' | 'name'>>({
				_id: 1,
				name: 1
			})
			.sort({ updatedAt: -1 })
			.toArray()
	};
};
