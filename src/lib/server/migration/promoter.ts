import type { MigrationObjectType, MigrationStagedObject } from '$lib/types/MigrationStagedObject';

export interface PromoteResult {
	/** be-BOP entity id of the created/updated record. */
	promotedAsId: string;
	/** Optional human-readable label for UI. */
	promotedAsLabel?: string;
}

export interface MigrationPromoter {
	/** Object type this promoter handles. */
	type: MigrationObjectType;
	/** Action label shown in the UI, e.g. "Create CMS page", "Create product". */
	actionLabel: string;
	/**
	 * Write the be-BOP entity from a staged object's normalized payload.
	 * The manager handles status transition and promotedAsId tracking after
	 * this resolves.
	 */
	promote(staged: MigrationStagedObject): Promise<PromoteResult>;
}
