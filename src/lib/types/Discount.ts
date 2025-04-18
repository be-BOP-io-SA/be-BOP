import type { Product } from './Product';
import type { Timestamps } from './Timestamps';

export type Discount = Timestamps & {
	_id: string;
	name: string;
	subscriptionIds: string[];
	/* If empty, works on all products */
	productIds: Product['_id'][];
	wholeCatalog: boolean;
	beginsAt: Date;
	endsAt: Date | null;
} & (
		| {
				mode: 'percentage';
				percentage: number;
		  }
		| {
				mode: 'freeProducts';
				quantityPerProduct: Record<string, number>;
		  }
	);
