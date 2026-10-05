import type { Product } from '$lib/types/Product';

// POS accounts browse the retail catalogue, everyone else the e-shop one.
export function isVisibleToViewer(
	product: Pick<Product, 'actionSettings'>,
	locals: Pick<App.Locals, 'user'>
) {
	return locals.user?.hasPosOptions
		? product.actionSettings.retail.visible
		: product.actionSettings.eShop.visible;
}
