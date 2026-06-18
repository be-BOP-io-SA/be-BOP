import { collections } from '$lib/server/database';

export const load = async () => {
	const searchlists = await collections.searchlists
		.find({})
		.sort({ updatedAt: -1 })
		.project<{ _id: string; name: string; disabled?: boolean }>({ _id: 1, name: 1, disabled: 1 })
		.toArray();

	return { searchlists };
};
