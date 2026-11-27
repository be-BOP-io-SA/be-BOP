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

/**
 * Products a machine caller may see: visible on the eShop **or** in retail.
 *
 * Shared by the catalog reads and by picture serving, so an image cannot be reachable for a
 * product the catalog itself would refuse to name.
 */
export function catalogVisibilityFilter(): Record<string, unknown> {
	return {
		$or: [{ 'actionSettings.eShop.visible': true }, { 'actionSettings.retail.visible': true }]
	};
}
