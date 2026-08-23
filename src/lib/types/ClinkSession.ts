import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';

/**
 * Persisted CLINK payment session.
 * Stored in MongoDB to survive server restarts and enable receipt reconciliation.
 */
export interface ClinkSessionDoc extends Timestamps {
	_id: ObjectId;

	/** Offer ID hex from the nOffer — unique session key */
	offerId: string;

	/** BOLT11 invoice string from Lightning.Pub */
	bolt11: string;

	/** Payment hash (empty when not available from CLINK response) */
	paymentHash: string;

	/** When the session expires (TTL index — MongoDB auto-deletes after this) */
	expiresAt: Date;

	/** Whether the Nostr receipt has been received confirming payment */
	paid: boolean;
}
