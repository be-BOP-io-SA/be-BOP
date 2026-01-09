import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';
import type { Kind } from 'nostr-tools';

/**
 * NostR message to send
 */
export interface NostRNotification extends Timestamps {
	_id: ObjectId;

	content: string;
	kind: Kind.EncryptedDirectMessage | Kind.Metadata | Kind.Zap;

	/**
	 * When kind is Kind.EncryptedDirectMessage, this is the recipient's pubkey
	 */
	dest?: string;

	/** When replying to someone, we may want to increase seconds by 1 in our reply */
	minCreatedAt?: Date;

	processedAt?: Date;

	// NIP-57 Zap Receipt fields (when kind === Kind.Zap):

	/** BOLT11 invoice (for zap receipt) */
	bolt11?: string;

	/** Payment preimage (for zap receipt) */
	preimage?: string;

	/** Stringified zap request event (for description tag of zap receipt) */
	zapRequest?: string;

	/** Receiver pubkey hex (for 'p' tag) */
	receiverPubkey?: string;

	/** Sender pubkey hex (for 'P' tag) */
	senderPubkey?: string;

	/** Optional event ID being zapped (for 'e' tag) */
	eventId?: string;
}
