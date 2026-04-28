import type { PaymentMethod } from '$lib/server/payment-methods';
import type { CountryAlpha2 } from './Country';
import type { Product } from './Product';
import type { Timestamps } from './Timestamps';

export type DiscountChannel = 'web' | 'web-pos' | 'pos-touch' | 'nostr-bot';

export interface ProductCombination {
	products: Array<{ productId: string; quantity: number }>;
}

export type Discount = Timestamps & {
	_id: string;
	name: string;
	/** If set, user must have at least one of these active subscriptions */
	subscriptionIds?: string[];
	/** Promo code (case-insensitive match). Percentage mode only */
	promoCode?: string;
	/** Sales channels where this discount applies */
	channels?: DiscountChannel[];
	/** Discount targets products carrying any of these tags (OR with productIds) */
	requiredTagIds?: string[];
	/** Payment methods required for discount */
	paymentMethods?: PaymentMethod[];
	/** Delivery country required */
	deliveryCountry?: CountryAlpha2;
	/** Billing country required (independent AND-condition) */
	billingCountry?: CountryAlpha2;
	/** Contact addresses (email, npub, phone) — logged-in users only */
	contactAddresses?: string[];
	/** Product combinations: OR between combos, AND within each */
	productCombinations?: ProductCombination[];
	/** Show the "-X%" badge on product page (default: true) */
	showBadge?: boolean;
	/** Show "X% off for Y hours" expiration reminder on product page */
	showExpirationBanner?: boolean;
	/** If empty, works on all products */
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
