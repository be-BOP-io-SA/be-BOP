/**
 * For paid subscriptions
 */

import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';
import type { UserIdentifier } from './UserIdentifier';

export interface PaidSubscription extends Timestamps {
	_id: string;

	number: number;

	user: UserIdentifier;

	productId: string;

	paidUntil: Date;

	notifications: Array<{
		type: 'reminder' | 'expiration';
		createdAt: Date;
		/** 'none' is in the case where the notification medium is not supported */
		medium: 'nostr' | 'none'; // todo: email
		_id: ObjectId;
	}>;

	cancelledAt?: Date;
	freeProductsById?: Record<string, { available: number; total: number; used: number }>;
}
