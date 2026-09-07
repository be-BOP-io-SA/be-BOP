import type { CartErrorCode } from '$lib/server/cart';

// Re-exported so client code can name a cart error code without reaching into a server module.
export type { CartErrorCode };

/**
 * The translation key for each refusal the cart can raise.
 *
 * There is one table, and every surface reads it: the product page, the cart, the shared-cart
 * popup. The messages carried by the errors themselves are an English last resort meant for
 * NostR and API clients, and they used to reach the screen whenever a surface had no case for
 * a code — which was most of them.
 */
export function cartErrorKey(code: CartErrorCode): string {
	switch (code) {
		case 'NOT_FOR_SALE':
			return 'product.notForSale';
		case 'OUT_OF_STOCK':
			return 'product.outOfStock';
		case 'MAX_ITEMS_REACHED':
			return 'cart.reachedMaxPerLine';
		case 'MAX_PER_ORDER':
			return 'cart.maxQuantityReached';
		case 'VARIATION_INVALID':
			return 'cartFromUrl.errors.reasonVariationRequired';
		case 'BOOKING_INFO_REQUIRED':
			return 'cartFromUrl.errors.reasonBookingRequired';
		case 'BOOKING_SAME_DAY_DISABLED':
		case 'BOOKING_SAME_DAY_CUTOFF_PASSED':
			return `cart.error.${code}`;
		case 'LOGIN_REQUIRED':
		case 'NOT_WHITELISTED':
		case 'MAX_PER_USER':
			return `saleLock.${code}`;
		case 'NOT_PWYW':
		case 'NOT_PREORDER':
		case 'STANDALONE_QTY_ONE':
		case 'SUBSCRIPTION_CUSTOM_PRICE':
		case 'MAX_PRICE_EXCEEDED':
			return `cart.error.${code}`;
		default:
			code satisfies never;
			return 'cartFromUrl.errors.reasonGeneric';
	}
}
