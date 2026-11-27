import { collections } from '$lib/server/database';
import {
	checkProductVariationsIntegrity,
	exceedsMaximumPrice,
	productPriceWithVariations,
	type Product
} from '$lib/types/Product';
import type { Price } from '$lib/types/Order';
import type { ApiV1Warning } from '$lib/types/ApiV1';
import type { OrderWriteCommand } from '$lib/server/api/v1/schemas/orders-write';
import { toCurrency } from '$lib/utils/toCurrency';
import { minorToPrice } from './money';

export type ResolvedLine = {
	product: Product;
	quantity: number;
	customPrice?: Price;
	chosenVariations?: Record<string, string>;
	missing: boolean;
};

function stubMissingProduct(productId: string, price: Price): Product {
	return {
		_id: productId,
		name: `Missing product ${productId}`,
		alias: [productId],
		description: '',
		shortDescription: '',
		type: 'resource',
		price,
		shipping: false,
		preorder: false,
		free: price.amount === 0,
		standalone: false,
		isTicket: false,
		displayShortDescription: false,
		payWhatYouWant: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		hideDiscountExpiration: false,
		actionSettings: {
			eShop: { visible: false, canBeAddedToBasket: false },
			googleShopping: { visible: false },
			retail: { visible: true, canBeAddedToBasket: true },
			nostr: { visible: false, canBeAddedToBasket: false }
		}
	};
}

/** Prices are only comparable within one currency; a differing currency is itself a divergence. */
function samePrice(a: Price, b: Price): boolean {
	return a.currency === b.currency && Math.abs(a.amount - b.amount) < 1e-9;
}

/**
 * Whether the shop lets a buyer pay this much for a pay-what-you-want product: at least its price,
 * which is the minimum, and at most its maximum price when it has one.
 */
function isAllowedPayWhatYouWantPrice(product: Product, sent: Price): boolean {
	if (!product.payWhatYouWant) {
		return false;
	}
	const minimum = toCurrency(sent.currency, product.price.amount, product.price.currency);
	return sent.amount >= minimum && !exceedsMaximumPrice(product, sent);
}

/**
 * Resolve catalog products for an order command.
 *
 * A product be-BOP does not know is only accepted when the third-party system is the source of
 * truth and sent a price above zero: it becomes a shipping:false stub named `Missing product {id}`
 * at that price, with a PRODUCT_MISSING warning. Any other unknown product is listed in
 * `refusedProductIds`, and the caller refuses the command before anything is written.
 */
export async function resolveProducts(
	items: OrderWriteCommand['items'],
	opts: { trustExternalPricing: boolean }
): Promise<{ lines: ResolvedLine[]; warnings: ApiV1Warning[]; refusedProductIds: string[] }> {
	const ids = [...new Set(items.map((item) => item.productId))];
	const found = await collections.products.find({ _id: { $in: ids } }).toArray();
	const byId = new Map(found.map((product) => [product._id, product]));

	const warnings: ApiV1Warning[] = [];
	const lines: ResolvedLine[] = [];
	const refusedProductIds = new Set<string>();

	for (const item of items) {
		const clientPrice = item.customPrice
			? minorToPrice(item.customPrice.amountMinor, item.customPrice.currency)
			: undefined;
		const existing = byId.get(item.productId);
		// The web cart prices variations when the line is added (cart.ts). Face A has no cart, so
		// do it here: createOrder computes the order total from these lines and only patches
		// customPrice afterwards, too late to reach the total or the payment amount.
		const variationPrice =
			existing &&
			existing.variations?.length &&
			!existing.payWhatYouWant &&
			checkProductVariationsIntegrity(existing, item.chosenVariations)
				? {
						amount: productPriceWithVariations(existing, item.chosenVariations),
						currency: existing.price.currency
				  }
				: undefined;
		// With the third-party system as the source of truth, the price it sent is the price: it
		// records what was actually charged, and a batch uploaded hours later must not be repriced
		// by a catalogue that moved in between. Otherwise be-BOP prices the line from its own
		// catalogue and the price sent is ignored. Either way, a divergence is reported.
		// A pay-what-you-want amount the shop allows is no divergence: the buyer chose it.
		const chosenByBuyer =
			!!existing && !!clientPrice && isAllowedPayWhatYouWantPrice(existing, clientPrice);
		const honoursClientPrice = opts.trustExternalPricing || !existing || chosenByBuyer;
		const customPrice = (honoursClientPrice ? clientPrice : undefined) ?? variationPrice;
		const expectedPrice = variationPrice ?? existing?.price;
		if (clientPrice && expectedPrice && !chosenByBuyer && !samePrice(clientPrice, expectedPrice)) {
			warnings.push({
				code: 'PRICE_OVERRIDE',
				message: honoursClientPrice
					? `Price sent for ${item.productId} differs from the catalogue price`
					: `Price sent for ${item.productId} ignored, the catalogue price is charged`,
				productId: item.productId,
				details: {
					sent: { amount: clientPrice.amount, currency: clientPrice.currency },
					expected: { amount: expectedPrice.amount, currency: expectedPrice.currency },
					...(variationPrice && { basis: 'variations' })
				}
			});
		}
		const missing = !existing;
		// A price of zero, or below, is no price: it would open a free line on a product nobody knows.
		if (missing && !(opts.trustExternalPricing && clientPrice && clientPrice.amount > 0)) {
			refusedProductIds.add(item.productId);
			continue;
		}
		if (missing) {
			warnings.push({
				code: 'PRODUCT_MISSING',
				message: `Product not found: ${item.productId}`,
				productId: item.productId
			});
		}
		lines.push({
			// Only an unknown product sent with its price gets here, so `clientPrice` is set.
			product: existing ?? stubMissingProduct(item.productId, clientPrice as Price),
			quantity: item.quantity,
			...(customPrice && { customPrice }),
			...(item.chosenVariations && { chosenVariations: item.chosenVariations }),
			missing
		});
	}

	return { lines, warnings, refusedProductIds: [...refusedProductIds] };
}
