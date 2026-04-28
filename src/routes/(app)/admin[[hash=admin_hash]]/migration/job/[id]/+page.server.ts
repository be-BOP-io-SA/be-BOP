import { error } from '@sveltejs/kit';
import {
	countStagedByJob,
	getJob,
	listStagedByJob
} from '$lib/server/migration/manager';
import { getPromoter } from '$lib/server/migration/promoters';
import {
	MIGRATION_OBJECT_TYPES,
	type MigrationObjectType,
	type MigrationStagedStatus
} from '$lib/types/MigrationStagedObject';

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
