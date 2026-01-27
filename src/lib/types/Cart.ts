import type { ObjectId } from 'mongodb';
import { type Currency } from './Currency';
import type { Timestamps } from './Timestamps';
import type { UserIdentifier } from './UserIdentifier';
import type { User } from './User';

export interface Cart extends Timestamps {
	_id: ObjectId;
	user: UserIdentifier;
	origin?: 'touch-selfcare' | 'web' | 'employee' | 'point-of-sale';
	target?: 'onsite' | 'take-away';
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
		discountPercentage?: number;
		internalNote?: { value: string; updatedAt: Date; updatedById?: User['_id'] };
		chosenVariations?: Record<string, string>;
	}>;
	orderTabSlug?: string;
	orderTabId?: ObjectId;
	splitMode?: 'items' | 'shares';
}
