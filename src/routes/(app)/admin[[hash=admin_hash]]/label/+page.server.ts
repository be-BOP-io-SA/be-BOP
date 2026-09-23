import { collections } from '$lib/server/database';
import type { OrderLabel } from '$lib/types/OrderLabel';

export async function load() {
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
}
