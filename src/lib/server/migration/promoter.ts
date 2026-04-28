import type { MigrationObjectType, MigrationStagedObject } from '$lib/types/MigrationStagedObject';

export interface PromoteResult {
	/** be-BOP entity id of the created/updated record. */
	promotedAsId: string;
	/** Optional human-readable label for UI. */
	promotedAsLabel?: string;
}

/**
 * One proposed accept/ignore item rendered to the admin in the review UI
 * before promote. Used by promoters that don't promote everything from
 * normalized as-is — e.g. settings, where the admin picks per-field which
 * proposed changes to apply.
 */
export interface ProposedChange {
	/** Stable key for form submission and accept-state tracking. */
	key: string;
	/** Human-readable label, e.g. "Brand name". */
	label: string;
	/** Current be-BOP value before any change. */
	currentValue: unknown;
	/** Value that will be applied if the admin accepts this change. */
	proposedValue: unknown;
	/** When set, the change is shown but not selectable; explains why. */
	disabledReason?: string;
}

export interface PromoteOptions {
	/** Subset of `ProposedChange.key` values the admin chose to apply. */
	acceptedKeys?: string[];
}

export interface MigrationPromoter {
	/** Object type this promoter handles. */
	type: MigrationObjectType;
	/** Action label shown in the UI, e.g. "Create CMS page", "Create product". */
	actionLabel: string;
	/**
	 * Optional. When defined, the staged-object detail page renders the
	 * returned changes as an accept/ignore list instead of a single
	 * "Promote" button. The selected keys are passed to `promote` via
	 * `PromoteOptions.acceptedKeys`.
	 */
	proposedChanges?(staged: MigrationStagedObject): Promise<ProposedChange[]>;
	/**
	 * Write the be-BOP entity from a staged object's normalized payload.
	 * The manager handles status transition and promotedAsId tracking after
	 * this resolves.
	 */
	promote(staged: MigrationStagedObject, options?: PromoteOptions): Promise<PromoteResult>;
}
