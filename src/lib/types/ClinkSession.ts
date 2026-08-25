import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';

/**
 * Persisted CLINK payment session.
 * Stored in MongoDB to survive server restarts and enable receipt reconciliation.
 */
export interface ClinkSessionDoc extends Timestamps {
	_id: ObjectId;

	/** Per-invoice session key (hash of bolt11) — unique session key */
	sessionKey: string;

	/** BOLT11 invoice string from Lightning.Pub */
	bolt11: string;

	/** Payment hash */
	paymentHash: string;

	/** When the session expires (TTL index — MongoDB auto-deletes after this) */
	expiresAt: Date;

	/** Whether the Nostr receipt has been received confirming payment */
	paid: boolean;

	/** Nostr event ID of the original payment request (for receipt correlation via #e tag) */
	nostrEventId?: string;

	/** Legacy offer ID (kept for backward compat during transition) */
	offerId?: string;
}
