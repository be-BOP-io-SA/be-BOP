import { collections } from '$lib/server/database';
import type { Countdown } from '$lib/types/Countdown';

export async function load() {
	return {
		countdowns: await collections.countdowns
			.find({})
			.project<Pick<Countdown, '_id' | 'name'>>({
				_id: 1,
				name: 1
			})
			.sort({ updatedAt: -1 })
			.toArray()
	};
}
