import { error, fail } from '@sveltejs/kit';
import {
	getStaged,
	ignoreStaged,
	promoteStaged,
	unignoreStaged
} from '$lib/server/migration/manager';
import { getPromoter } from '$lib/server/migration/promoters';
import type { Actions } from './$types';

export const load = async ({ params }) => {
	const staged = await getStaged(params.id);
	if (!staged) {
		throw error(404, 'Staged object not found');
	}
	const promoter = getPromoter(staged.type);
	return {
		staged: {
			...staged,
			_id: staged._id.toString(),
			jobId: staged.jobId.toString()
		},
		promoter: promoter
			? { type: promoter.type, actionLabel: promoter.actionLabel }
			: null
	};
};

export const actions: Actions = {
	promote: async ({ params }) => {
		try {
			const result = await promoteStaged(params.id);
			return { promoted: result };
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Could not promote'
			});
		}
	},
	ignore: async ({ params }) => {
		try {
			await ignoreStaged(params.id);
			return { ignored: true };
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Could not ignore'
			});
		}
	},
	unignore: async ({ params }) => {
		try {
			await unignoreStaged(params.id);
			return { unignored: true };
		} catch (err) {
			return fail(400, {
				error: err instanceof Error ? err.message : 'Could not unignore'
			});
		}
	}
};
