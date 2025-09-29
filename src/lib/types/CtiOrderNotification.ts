import { ObjectId } from 'mongodb';
import { Order } from './Order';
import { Timestamps } from './Timestamps';

export interface CtiOrderNotification extends Timestamps {
	_id: ObjectId;
	orderId: Order['_id'];
	authenticationCode?: {
		value: string;
		expiresAt: Date;
	};
	receiptSentAt?: Date;
}
