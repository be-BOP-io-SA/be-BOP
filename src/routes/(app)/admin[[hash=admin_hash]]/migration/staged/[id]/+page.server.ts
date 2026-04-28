import { error, fail } from '@sveltejs/kit';
import {
	getProposedChanges,
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
	const proposedChanges = staged.status === 'staged' ? await getProposedChanges(params.id) : null;
	return {
		staged: {
			...staged,
			_id: staged._id.toString(),
			jobId: staged.jobId.toString()
		},
		promoter: promoter
			? {
					type: promoter.type,
					actionLabel: promoter.actionLabel,
					hasProposedChanges: !!promoter.proposedChanges
			  }
			: null,
		proposedChanges
	};
};

export const actions: Actions = {
	promote: async ({ params, request }) => {
		try {
			const formData = await request.formData();
			const acceptedKeys = formData.getAll('accepted').map(String);
			const options = acceptedKeys.length > 0 ? { acceptedKeys } : undefined;
			const result = await promoteStaged(params.id, options);
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
