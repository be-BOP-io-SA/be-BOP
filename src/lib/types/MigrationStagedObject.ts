import type { ObjectId } from 'mongodb';

export const MIGRATION_OBJECT_TYPES = [
	'product',
	'cmsPage',
	'settings',
	'theme',
	'image',
	'orphan'
] as const;
export type MigrationObjectType = (typeof MIGRATION_OBJECT_TYPES)[number];

export const MIGRATION_STAGED_STATUSES = ['staged', 'promoted', 'ignored'] as const;
export type MigrationStagedStatus = (typeof MIGRATION_STAGED_STATUSES)[number];

/**
 * Where a staged object is referenced. Mostly used for images, which can be
 * referenced from products, CMS pages, settings, or be standalone in the
 * source media library.
 */
export type MigrationOrigin =
	| { context: 'product'; parentSourceId: string; role?: 'featured' | 'gallery' }
	| { context: 'cmsPage'; parentSourceId: string }
	| { context: 'settings'; settingKey?: string }
	| { context: 'theme' }
	| { context: 'standalone' };

export interface MigrationStagedObject {
	_id: ObjectId;
	jobId: ObjectId;
	source: string;
	/** Unique within the source for the duration of a job (idempotency key). */
	sourceId: string;
	/** Native source type, for debug and orphans. */
	sourceType: string;
	/** be-BOP-side category for review-UI grouping. */
	type: MigrationObjectType;
	raw: Record<string, unknown>;
	normalized?: Record<string, unknown>;
	origins?: MigrationOrigin[];
	status: MigrationStagedStatus;
	/** _id of the be-BOP entity created on promote. */
	promotedAsId?: string;
	promotedAt?: Date;
	fetchedAt: Date;
}
