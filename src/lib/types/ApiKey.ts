import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';
import type { ApiV1Scope } from './ApiV1';

/** What the creation form starts with for the two stream settings; the admin can change or clear them. */
export const STREAM_SETTINGS_PREFILL = { maxConcurrentStreams: 4, streamLifetimeSeconds: 1200 };

/**
 * Longest lifetime a stream can be given, about 24.8 days: the longest delay a Node.js timer holds,
 * in whole seconds. Past it the timer fires at once, and the stream would close as soon as opened.
 * A device meant to stay connected longer reconnects on its own at the end of each lifetime.
 */
export const MAX_STREAM_LIFETIME_SECONDS = 2_147_483;

/**
 * Kinds of doubtful call be-BOP watches for. Each one flags the key that made it as suspicious and
 * is written to that key's own journal; a new kind is one more entry here and one more check.
 *
 * - `labelColorCss`: a label color carrying a CSS declaration or a `url(`, an attempt to style the
 *   shop's pages through a field meant for a color.
 */
export const API_KEY_SUSPICIOUS_EVENT_TYPES = ['labelColorCss'] as const;
export type ApiKeySuspiciousEventType = (typeof API_KEY_SUSPICIOUS_EVENT_TYPES)[number];

export interface ApiKeySuspiciousEvent {
	type: ApiKeySuspiciousEventType;
	at: Date;
	/** The call it came with, e.g. `POST /api/v1/orders/{orderId}/labels`. */
	call: string;
	/** What was received, cut short. */
	detail: string;
}

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
	/**
	 * When true, the key only reaches the orders it wrote itself (`externalSourceApiKeyId`): order
	 * listings and event streams leave every other order out, and notes and labels can only be added
	 * to its own. Undefined or false, the key reaches every order of the shop, web orders included.
	 */
	ownOrdersOnly?: boolean;
	expiresAt?: Date;
	revokedAt?: Date;
	/**
	 * Set while the key is suspended by hand: the API refuses it as it refuses a revoked key, but the
	 * key stays in place and can be reactivated.
	 */
	suspendedAt?: Date;
	/**
	 * Set when the key first made a doubtful call, and kept until an admin clears it by hand. It
	 * changes nothing to what the key may do: suspending is a separate, manual decision, so a
	 * stranger cannot get a key switched off just by sending doubtful calls with it.
	 */
	suspiciousAt?: Date;
	/** The doubtful calls the key made, oldest first, the most recent ones only. */
	suspiciousEvents?: ApiKeySuspiciousEvent[];
	lastUsedAt?: Date;
	createdBy?: string;
}
