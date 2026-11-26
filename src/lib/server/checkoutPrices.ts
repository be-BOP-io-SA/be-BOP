import type { CountryAlpha2 } from '$lib/types/Country';
import type { Product } from '$lib/types/Product';
import { collections } from './database';
import {
	collectUserAddresses,
	getActivePercentageDiscounts,
	isAuthenticated,
	selectBestDiscount,
	webChannelForUser
} from './discount';
import type { PaymentMethod } from './payment-methods';
import { freeProductsForUser } from './subscriptions';
import { subscriptionRightsQuery, userIdentifier } from './user';

/**
 * The automatic discounts and free units the checkout shows, by payment method and countries.
 *
 * For a visitor who is not signed in they depend on the address typed in the contact field: it
 * may be on a discount's list of addresses, and it decides whether this browser session's
 * subscriptions still count (see `subscriptionRightsQuery`). The page asks again, through
 * `/checkout/prices`, each time that address changes, so the price shown is the one the order
 * charges.
 */
export async function checkoutPrices(params: {
	locals: App.Locals;
	items: Array<{
		product: Pick<Product, '_id' | 'price' | 'tagIds'>;
		quantity: number;
		customPrice?: { amount: number };
	}>;
	promoCode?: string;
	methods: PaymentMethod[];
	checkoutAddress?: string;
}) {
	const user = userIdentifier(params.locals);
	const checkoutAddress = isAuthenticated(user) ? undefined : params.checkoutAddress || undefined;
	const activeDiscounts = await getActivePercentageDiscounts();
	const paidSubs = await collections.paidSubscriptions
		.find({
			...subscriptionRightsQuery(user, checkoutAddress),
			paidUntil: { $gt: new Date() }
		})
		.toArray();
	const discountItems = params.items.map((item) => ({
		product: item.product,
		quantity: item.quantity,
		...(item.customPrice && { customPrice: item.customPrice })
	}));
	const baseDiscountContext = {
		userSubscriptionIds: paidSubs.map((subscription) => subscription.productId),
		promoCode: params.promoCode,
		channel: webChannelForUser(params.locals.user?.hasPosOptions),
		userContactAddresses: collectUserAddresses(user),
		checkoutAddress,
		cartItems: params.items.map((item) => ({
			productId: item.product._id,
			quantity: item.quantity,
			tagIds: item.product.tagIds
		})),
		isLoggedIn: isAuthenticated(user)
	};
	// Countries that can influence discount eligibility, split by condition axis.
	// Any other country produces the same result (condition fails), so we only vary these.
	// '' sentinel = "country not relevant to this axis".
	const relevantShipCountries = [
		...new Set(activeDiscounts.flatMap((d) => (d.deliveryCountry ? [d.deliveryCountry] : [])))
	];
	const relevantBillCountries = [
		...new Set(activeDiscounts.flatMap((d) => (d.billingCountry ? [d.billingCountry] : [])))
	];
	const shipKeys: Array<CountryAlpha2 | ''> = ['', ...relevantShipCountries];
	const billKeys: Array<CountryAlpha2 | ''> = ['', ...relevantBillCountries];

	// Key format: `${ship}|${bill}|${method}`. Frontend normalizes each chosen country to ''
	// unless it appears in the corresponding relevant list, then looks up the precomputed best.
	const discountByContext: Record<string, Record<string, number>> = Object.fromEntries(
		shipKeys.flatMap((ship) =>
			billKeys.flatMap((bill) =>
				params.methods.flatMap((method) => {
					const best = selectBestDiscount(activeDiscounts, discountItems, {
						...baseDiscountContext,
						...(ship && { deliveryCountry: ship }),
						...(bill && { billingCountry: bill }),
						paymentMethod: method
					});
					return best
						? [[`${ship}|${bill}|${method}`, Object.fromEntries(best.discountByProduct)]]
						: [];
				})
			)
		)
	);

	return {
		discountByContext,
		relevantShipCountries,
		relevantBillCountries,
		freeProductUnits: await freeProductsForUser(
			user,
			params.items.map((item) => item.product._id),
			checkoutAddress
		)
	};
}
