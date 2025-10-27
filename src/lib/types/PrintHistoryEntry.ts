import type { Product } from './Product';

export interface PrintHistoryEntry {
	timestamp: Date;
	poolLabel: string;
	itemCount: number;
	tagNames: string[];
	tagGroups: Array<{
		tagNames: string[];
		items: Array<{
			product: Pick<Product, 'name'>;
			quantity: number;
			variations: Array<{ text: string; count: number }>;
			notes: string[];
		}>;
	}>;
}
