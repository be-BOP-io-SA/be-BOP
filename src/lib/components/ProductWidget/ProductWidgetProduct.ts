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
> & {
	/** Set by the server when the product carries a whitelist the visitor does not match */
	restricted?: boolean;
};
