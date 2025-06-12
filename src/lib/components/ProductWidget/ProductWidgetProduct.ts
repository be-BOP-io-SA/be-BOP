import type { Product } from '$lib/types/Product';

export type ProductWidgetProduct = Pick<
	Product,
	| '_id'
	| 'name'
	| 'price'
	| 'shortDescription'
	| 'preorder'
	| 'availableDate'
	| 'shipping'
	| 'type'
	| 'actionSettings'
	| 'stock'
	| 'isTicket'
	| 'hasSellDisclaimer'
	| 'payWhatYouWant'
	| 'bookingSpec'
	| 'hasVariations'
>;
