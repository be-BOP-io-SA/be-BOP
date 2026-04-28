import type { ZodSchema } from 'zod';
import type { MigrationObjectType, MigrationOrigin } from '$lib/types/MigrationStagedObject';

export interface MigrationConnectorContext {
	reportProgress(progress: { step: string; current: number; total: number }): void;
}

export interface StagedObjectInput {
	sourceId: string;
	sourceType: string;
	type: MigrationObjectType;
	raw: Record<string, unknown>;
	normalized?: Record<string, unknown>;
	origins?: MigrationOrigin[];
}

export interface MigrationConnector<TConfig = Record<string, unknown>> {
	/** Stable identifier, e.g. 'wordpress'. Used as `source` on jobs and staged objects. */
	id: string;
	/** Human-readable name for the admin UI. */
	label: string;
	/** Zod schema describing the config payload (URL, credentials, options, …). */
	configSchema: ZodSchema<TConfig>;
	/**
	 * Field names in the config that hold secrets and must be stripped before
	 * the config is exposed to the client (e.g. WordPress app password).
	 */
	secretFields?: ReadonlyArray<keyof TConfig & string>;
	/** Quick connectivity / auth check before launching a full job. */
	testConnection(config: TConfig): Promise<{ ok: boolean; message: string }>;
	/**
	 * Yields staged-object inputs as the connector walks the source. The migration
	 * manager handles persistence and progress; the connector just emits.
	 */
	fetch(config: TConfig, ctx: MigrationConnectorContext): AsyncGenerator<StagedObjectInput>;
}

/** Replace secret field values with a constant placeholder. */
export function redactConfig(
	connector: MigrationConnector,
	config: Record<string, unknown>
): Record<string, unknown> {
	if (!connector.secretFields?.length) return { ...config };
	const out: Record<string, unknown> = { ...config };
	for (const key of connector.secretFields) {
		if (key in out) out[key] = '••••••••';
	}
	return out;
}
