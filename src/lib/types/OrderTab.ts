import type { ObjectId } from 'mongodb';
import type { Timestamps } from './Timestamps';
import type { User } from './User';
import type { PrintHistoryEntry } from './PrintHistoryEntry';

export interface OrderTabItem {
	_id: ObjectId;
	cartId?: ObjectId;
	orderId?: string;
	productId: string;
	quantity: number;
	internalNote?: { value: string; updatedAt: Date; updatedById?: User['_id'] };
	chosenVariations?: Record<string, string>;
	printStatus?: 'pending' | 'acknowledged';
	printedQuantity?: number;
}

export interface OrderTab extends Timestamps {
	_id: ObjectId;
	slug: string;
	items: Array<OrderTabItem>;
	printHistory?: PrintHistoryEntry[];
}

export interface OrderTabPoolStatus {
	slug: string;
	itemsCount: number;
}
