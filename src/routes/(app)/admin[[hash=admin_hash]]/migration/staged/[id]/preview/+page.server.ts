import { error } from '@sveltejs/kit';
import { getStaged } from '$lib/server/migration/manager';

export const load = async ({ params }) => {
	const staged = await getStaged(params.id);
	if (!staged) {
		throw error(404, 'Staged object not found');
	}
	return {
		staged: {
			...staged,
			_id: staged._id.toString(),
			jobId: staged.jobId.toString()
		}
	};
};
