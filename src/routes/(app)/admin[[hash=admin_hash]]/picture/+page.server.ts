import { collections } from '$lib/server/database';

export const load = async () => {
	return {
		pictures: await collections.pictures
			.find({
				productId: { $exists: false },
				slider: { $exists: false },
				tag: { $exists: false },
				schedule: { $exists: false }
			})
			.toArray()
	};
};
