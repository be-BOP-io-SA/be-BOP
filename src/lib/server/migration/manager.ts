import { ObjectId } from 'mongodb';
import { collections } from '../database';
import { getConnector } from './registry';
import { getPromoter } from './promoters';
import type { MigrationConnector, MigrationConnectorContext } from './connector';
import type { MigrationJob } from '$lib/types/MigrationJob';
import type {
	MigrationObjectType,
	MigrationStagedObject,
	MigrationStagedStatus
} from '$lib/types/MigrationStagedObject';
import type { MigrationSource } from '$lib/types/MigrationSource';

export async function createSource(input: {
	connectorId: string;
	label: string;
	config: Record<string, unknown>;
}): Promise<MigrationSource> {
	const connector = getConnector(input.connectorId);
	if (!connector) {
		throw new Error(`Unknown migration connector: ${input.connectorId}`);
	}
	const config = connector.configSchema.parse(input.config);

	const now = new Date();
	const source: MigrationSource = {
		_id: new ObjectId(),
		connectorId: connector.id,
		label: input.label.trim(),
		config: config as Record<string, unknown>,
		createdAt: now,
		updatedAt: now
	};
	await collections.migrationSources.insertOne(source);
	return source;
}

export async function listSources(): Promise<MigrationSource[]> {
	return collections.migrationSources.find().sort({ createdAt: -1 }).toArray();
}

export async function getSource(id: ObjectId | string): Promise<MigrationSource | null> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	return collections.migrationSources.findOne({ _id });
}

export async function deleteSource(id: ObjectId | string): Promise<void> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	await collections.migrationSources.deleteOne({ _id });
}

export async function recordSourceTestResult(
	id: ObjectId | string,
	result: { ok: boolean; message: string }
): Promise<void> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	await collections.migrationSources.updateOne(
		{ _id },
		{ $set: { lastTestedAt: new Date(), lastTestResult: result, updatedAt: new Date() } }
	);
}

export async function startJobFromSource(sourceId: ObjectId | string): Promise<MigrationJob> {
	const source = await getSource(sourceId);
	if (!source) {
		throw new Error('Source not found');
	}
	const connector = getConnector(source.connectorId);
	if (!connector) {
		throw new Error(`Unknown migration connector: ${source.connectorId}`);
	}
	const config = connector.configSchema.parse(source.config);

	const now = new Date();
	const job: MigrationJob = {
		_id: new ObjectId(),
		source: connector.id,
		sourceId: source._id,
		config: config as Record<string, unknown>,
		status: 'pending',
		counts: {},
		createdAt: now,
		updatedAt: now
	};
	await collections.migrationJobs.insertOne(job);

	// Async naïf: fire-and-forget, persists progress & status to MongoDB so the
	// admin UI can poll. If the server restarts mid-job, the job stays in
	// 'running' until cleaned up manually — acceptable for a one-shot tool.
	void runJob(job._id, connector, config).catch(async (err) => {
		console.error('Migration job failed:', err);
		await collections.migrationJobs.updateOne(
			{ _id: job._id },
			{
				$set: {
					status: 'failed',
					error: err instanceof Error ? err.message : String(err),
					finishedAt: new Date(),
					updatedAt: new Date()
				}
			}
		);
	});

	return job;
}

async function runJob(
	jobId: ObjectId,
	connector: MigrationConnector,
	config: unknown
): Promise<void> {
	const startedAt = new Date();
	await collections.migrationJobs.updateOne(
		{ _id: jobId },
		{ $set: { status: 'running', startedAt, updatedAt: startedAt } }
	);

	const counts: Record<string, number> = {};
	const ctx: MigrationConnectorContext = {
		reportProgress: (progress) => {
			void collections.migrationJobs.updateOne(
				{ _id: jobId },
				{ $set: { progress, updatedAt: new Date() } }
			);
		}
	};

	for await (const obj of connector.fetch(config as never, ctx)) {
		const staged: MigrationStagedObject = {
			_id: new ObjectId(),
			jobId,
			source: connector.id,
			sourceId: obj.sourceId,
			sourceType: obj.sourceType,
			type: obj.type,
			raw: obj.raw,
			normalized: obj.normalized,
			origins: obj.origins,
			status: 'staged',
			fetchedAt: new Date()
		};
		await collections.migrationStagedObjects.insertOne(staged);
		counts[obj.type] = (counts[obj.type] ?? 0) + 1;
	}

	const finishedAt = new Date();
	await collections.migrationJobs.updateOne(
		{ _id: jobId },
		{ $set: { status: 'done', finishedAt, counts, updatedAt: finishedAt } }
	);
}

export async function listJobs(limit = 20): Promise<MigrationJob[]> {
	return collections.migrationJobs.find().sort({ createdAt: -1 }).limit(limit).toArray();
}

export async function getJob(id: ObjectId | string): Promise<MigrationJob | null> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	return collections.migrationJobs.findOne({ _id });
}

export async function getStaged(
	id: ObjectId | string
): Promise<MigrationStagedObject | null> {
	const _id = typeof id === 'string' ? new ObjectId(id) : id;
	return collections.migrationStagedObjects.findOne({ _id });
}

export async function listStagedByJob(
	jobId: ObjectId | string,
	filter?: { type?: MigrationObjectType; status?: MigrationStagedStatus }
): Promise<MigrationStagedObject[]> {
	const _jobId = typeof jobId === 'string' ? new ObjectId(jobId) : jobId;
	const query: Record<string, unknown> = { jobId: _jobId };
	if (filter?.type) query.type = filter.type;
	if (filter?.status) query.status = filter.status;
	return collections.migrationStagedObjects.find(query).sort({ fetchedAt: 1 }).toArray();
}

export async function countStagedByJob(
	jobId: ObjectId | string
): Promise<Array<{ type: MigrationObjectType; status: MigrationStagedStatus; count: number }>> {
	const _jobId = typeof jobId === 'string' ? new ObjectId(jobId) : jobId;
	return collections.migrationStagedObjects
		.aggregate<{ type: MigrationObjectType; status: MigrationStagedStatus; count: number }>([
			{ $match: { jobId: _jobId } },
			{
				$group: {
					_id: { type: '$type', status: '$status' },
					count: { $sum: 1 }
				}
			},
			{
				$project: {
					_id: 0,
					type: '$_id.type',
					status: '$_id.status',
					count: 1
				}
			}
		])
		.toArray();
}

export async function promoteStaged(
	id: ObjectId | string,
	options?: { acceptedKeys?: string[] }
): Promise<{
	promotedAsId: string;
	promotedAsLabel?: string;
}> {
	const staged = await getStaged(id);
	if (!staged) throw new Error('Staged object not found');
	if (staged.status === 'promoted') {
		throw new Error('Object is already promoted');
	}
	const promoter = getPromoter(staged.type);
	if (!promoter) {
		throw new Error(`Promotion not implemented for type "${staged.type}" yet`);
	}
	const result = await promoter.promote(staged, options);
	const now = new Date();
	await collections.migrationStagedObjects.updateOne(
		{ _id: staged._id },
		{
			$set: {
				status: 'promoted',
				promotedAsId: result.promotedAsId,
				promotedAt: now
			}
		}
	);
	return result;
}

export async function getProposedChanges(
	id: ObjectId | string
): Promise<import('./promoter').ProposedChange[] | null> {
	const staged = await getStaged(id);
	if (!staged) return null;
	const promoter = getPromoter(staged.type);
	if (!promoter || !promoter.proposedChanges) return null;
	return promoter.proposedChanges(staged);
}

export async function ignoreStaged(id: ObjectId | string): Promise<void> {
	const staged = await getStaged(id);
	if (!staged) throw new Error('Staged object not found');
	await collections.migrationStagedObjects.updateOne(
		{ _id: staged._id },
		{ $set: { status: 'ignored' } }
	);
}

export async function unignoreStaged(id: ObjectId | string): Promise<void> {
	const staged = await getStaged(id);
	if (!staged) throw new Error('Staged object not found');
	if (staged.status !== 'ignored') return;
	await collections.migrationStagedObjects.updateOne(
		{ _id: staged._id },
		{ $set: { status: 'staged' } }
	);
}
