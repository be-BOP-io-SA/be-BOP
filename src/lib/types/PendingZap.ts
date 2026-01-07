import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';

/**
 * Pending zap waiting for payment confirmation
 * NIP-57: https://github.com/nostr-protocol/nips/blob/master/57.md
 */
export interface PendingZap extends Timestamps {
	_id: ObjectId;

	/** Invoice payment hash (r_hash) */
	invoiceId: string;

	/** BOLT11 invoice string */
	bolt11: string;

	/** Stringified zap request event (kind 9734) */
	zapRequest: string;

	/** Receiver pubkey (hex) from 'p' tag of zap request */
	receiverPubkey: string;

	/** Sender pubkey (hex) from zap request event.pubkey */
	senderPubkey: string;

	/** Optional event ID being zapped (from 'e' tag) */
	eventId?: string;

	/** Lightning processor used */
	processor: 'lnd' | 'phoenixd';

	/** When zap receipt was published */
	processedAt?: Date;
}
