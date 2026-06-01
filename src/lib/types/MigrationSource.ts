import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';

export interface MigrationSource extends Timestamps {
	_id: ObjectId;
	/** Connector id, e.g. 'wordpress'. */
	connectorId: string;
	/** Admin-given name, e.g. "Pilot shop". */
	label: string;
	/**
	 * Connector-specific config (URL, credentials, options). Stored as-is —
	 * consistent with how runtime-config persists secrets such as Nostr private
	 * key. Secret fields are listed by the connector and stripped before being
	 * returned to the client.
	 */
	config: Record<string, unknown>;
	lastTestedAt?: Date;
	lastTestResult?: { ok: boolean; message: string };
}
