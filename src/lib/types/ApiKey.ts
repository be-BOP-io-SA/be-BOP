import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';
import type { ApiV1Scope } from './ApiV1';

export type ApiKeyEnvironment = 'live' | 'test';

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
	 * Non-secret prefix derived from the secret (e.g. bebop_ak_live_abcd1234),
	 * unique, used to help operators identify keys without exposing the secret.
	 */
	keyPrefix: string;
	scopes: ApiV1Scope[];
	environment: ApiKeyEnvironment;
	expiresAt?: Date;
	revokedAt?: Date;
	lastUsedAt?: Date;
	createdBy?: string;
}
