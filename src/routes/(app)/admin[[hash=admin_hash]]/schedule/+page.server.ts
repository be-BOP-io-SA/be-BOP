import { collections } from '$lib/server/database';
import type { Schedule } from '$lib/types/Schedule';

export async function load() {
	return {
		schedules: await collections.schedules
			.find({})
			.project<Pick<Schedule, '_id' | 'name'>>({
				_id: 1,
				name: 1
			})
			.sort({ updatedAt: -1 })
			.toArray()
	};
}
