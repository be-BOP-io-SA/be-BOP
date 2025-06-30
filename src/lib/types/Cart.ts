import type { ObjectId } from 'mongodb';
import { type Currency } from './Currency';
import type { Timestamps } from './Timestamps';
import type { UserIdentifier } from './UserIdentifier';
import type { User } from './User';

export interface Cart extends Timestamps {
	_id: ObjectId;
	user: UserIdentifier;

	items: Array<{
		/**
		 * Unique identifier for the line in the cart.
		 *
		 * Used for removing items from the cart.
		 *
		 * Only optional for backwards compatibility.
		 */
		_id?: string;
		productId: string;
		quantity: number;
		booking?: {
			start: Date;
			end: Date;
		};
		customPrice?: { amount: number; currency: Currency };
		reservedUntil?: Date;
		depositPercentage?: number;
		internalNote?: { value: string; updatedAt: Date; updatedById?: User['_id'] };
		chosenVariations?: Record<string, string>;
	}>;
}
