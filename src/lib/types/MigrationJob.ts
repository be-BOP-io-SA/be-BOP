import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';

export const MIGRATION_JOB_STATUSES = ['pending', 'running', 'done', 'failed'] as const;
export type MigrationJobStatus = (typeof MIGRATION_JOB_STATUSES)[number];

export interface MigrationJob extends Timestamps {
	_id: ObjectId;
	/** Connector id, e.g. 'wordpress'. */
	source: string;
	/** Saved source the job was launched from. */
	sourceId?: ObjectId;
	/** Connector-specific config payload, validated by the connector's Zod schema. */
	config: Record<string, unknown>;
	status: MigrationJobStatus;
	progress?: { step: string; current: number; total: number };
	startedAt?: Date;
	finishedAt?: Date;
	error?: string;
	/** Per-type counts of staged objects produced by the job. */
	counts: Record<string, number>;
}
