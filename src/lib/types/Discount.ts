import type { Product } from './Product';
import type { Timestamps } from './Timestamps';

export interface Discount extends Timestamps {
	_id: string;
	name: string;
	subscriptionIds: string[];
	/* If empty, works on all products */
	productIds: Product['_id'][];
	percentage: number;
	wholeCatalog: boolean;
	beginsAt: Date;
	endsAt: Date | null;
}
