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
	/**
	 * Set by `annotateProductsWithSaleLocks` on listings. When true the widget CTA becomes a
	 * link to the product page, which is where the reason is spelled out.
	 */
	saleLocked?: boolean;
};
