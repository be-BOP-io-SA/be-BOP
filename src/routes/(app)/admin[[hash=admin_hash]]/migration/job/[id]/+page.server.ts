import { error, fail } from '@sveltejs/kit';
import {
	countStagedByJob,
	getJob,
	getStaged,
	ignoreStaged,
	listStagedByJob,
	promoteStaged
} from '$lib/server/migration/manager';
import { getPromoter } from '$lib/server/migration/promoters';
import {
	MIGRATION_OBJECT_TYPES,
	type MigrationObjectType,
	type MigrationStagedStatus
} from '$lib/types/MigrationStagedObject';
import type { Actions } from './$types';

export const load = async ({ params, url }) => {
	const job = await getJob(params.id);
	if (!job) {
		throw error(404, 'Migration job not found');
	}

	const typeFilter = (url.searchParams.get('type') ?? '') as MigrationObjectType | '';
	const statusFilter = (url.searchParams.get('status') ?? '') as MigrationStagedStatus | '';

	const [staged, counts] = await Promise.all([
		listStagedByJob(job._id, {
			type: typeFilter || undefined,
			status: statusFilter || undefined
		}),
		countStagedByJob(job._id)
	]);

	const typesWithPromoter = new Set(
		MIGRATION_OBJECT_TYPES.filter((t) => getPromoter(t) !== undefined)
	);

	return {
		job: { ...job, _id: job._id.toString(), sourceId: job.sourceId?.toString() },
		staged: staged.map((s) => ({
			...s,
			_id: s._id.toString(),
			jobId: s.jobId.toString()
		})),
		counts,
		typeFilter,
		statusFilter,
		availableTypes: MIGRATION_OBJECT_TYPES,
		promotableTypes: Array.from(typesWithPromoter)
	};
};

/**
 * For bulk promote: when the staged object's type has `proposedChanges`
 * (e.g. settings), auto-accept all non-disabled changes by default.
 * Without that, bulk-promoting a settings object would apply nothing.
 */
async function promoteOneWithDefaults(stagedId: string): Promise<{
	stagedId: string;
	promotedAsId: string;
	promotedAsLabel?: string;
}> {
	const staged = await getStaged(stagedId);
	if (!staged) throw new Error('Staged object not found');
	const promoter = getPromoter(staged.type);
	if (!promoter) throw new Error(`No promoter for type ${staged.type}`);

	let options: { acceptedKeys?: string[] } | undefined;
	if (promoter.proposedChanges) {
		const changes = await promoter.proposedChanges(staged);
		options = {
			acceptedKeys: changes.filter((c) => !c.disabledReason).map((c) => c.key)
		};
	}

	const result = await promoteStaged(stagedId, options);
	return { stagedId, ...result };
}

export const actions: Actions = {
	bulkPromote: async ({ request }) => {
		const formData = await request.formData();
		const ids = formData.getAll('staged_id').map(String).filter(Boolean);
		if (ids.length === 0) {
			return fail(400, { error: 'No objects selected' });
		}
		const success: Array<{ stagedId: string; promotedAsId: string; label?: string }> = [];
		const failed: Array<{ stagedId: string; error: string }> = [];
		for (const id of ids) {
			try {
				const r = await promoteOneWithDefaults(id);
				success.push({
					stagedId: r.stagedId,
					promotedAsId: r.promotedAsId,
					label: r.promotedAsLabel
				});
			} catch (err) {
				failed.push({
					stagedId: id,
					error: err instanceof Error ? err.message : String(err)
				});
			}
		}
		return { bulk: { action: 'promote', success, failed } };
	},

	bulkIgnore: async ({ request }) => {
		const formData = await request.formData();
		const ids = formData.getAll('staged_id').map(String).filter(Boolean);
		if (ids.length === 0) {
			return fail(400, { error: 'No objects selected' });
		}
		const success: Array<{ stagedId: string }> = [];
		const failed: Array<{ stagedId: string; error: string }> = [];
		for (const id of ids) {
			try {
				await ignoreStaged(id);
				success.push({ stagedId: id });
			} catch (err) {
				failed.push({
					stagedId: id,
					error: err instanceof Error ? err.message : String(err)
				});
			}
		}
		return { bulk: { action: 'ignore', success, failed } };
	}
};
