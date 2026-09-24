import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';
import type { ApiV1Scope } from './ApiV1';

/**
 * Server-side API key record. The raw secret is never stored — only
 * SHA-256(secret) as keyHash, plus a non-secret keyPrefix for display.
 */
export interface ApiKey extends Timestamps {
	_id: ObjectId;
	/** Human label, e.g. "PoS front desk". */
	name: string;
	/** SHA-256 hex digest of the secret (no pepper). */
	keyHash: string;
	/**
	 * Non-secret prefix derived from the secret (e.g. bebop_ak_abcd1234),
	 * unique, used to help operators identify keys without exposing the secret.
	 */
	keyPrefix: string;
	scopes: ApiV1Scope[];
	/**
	 * Event streams this key may hold open at once, across every stream surface. Undefined means no
	 * ceiling: nothing is compiled in, so a fleet is sized from the admin rather than from a release.
	 */
	maxConcurrentStreams?: number;
	/**
	 * Seconds an event stream opened with this key stays open before the server closes it. The client
	 * reconnects on its own and resumes where it left off, so closing costs it nothing.
	 *
	 * Undefined means the server never closes it. That is not the same as harmless: a device that
	 * disappears without hanging up — wifi out of range, battery flat — leaves a stream the server
	 * still believes in, and it is only ever counted, never returned.
	 */
	streamLifetimeSeconds?: number;
	expiresAt?: Date;
	revokedAt?: Date;
	lastUsedAt?: Date;
	createdBy?: string;
}
