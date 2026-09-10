import { collections } from '$lib/server/database';
import type { Currency } from '$lib/types/Currency';
import {
	checkProductVariationsIntegrity,
	productPriceWithVariations,
	type Product
} from '$lib/types/Product';
import type { Price } from '$lib/types/Order';
import type { ApiV1Warning } from '$lib/types/ApiV1';
import type { OrderWriteCommand } from '$lib/server/api/v1/schemas/orders-write';
import { minorToPrice } from './money';

export type ResolvedLine = {
	product: Product;
	quantity: number;
	customPrice?: Price;
	chosenVariations?: Record<string, string>;
	uniqueKey?: string;
	missing: boolean;
};

function stubMissingProduct(
	productId: string,
	customPrice: Price | undefined,
	orderCurrency: Currency
): Product {
	const price = customPrice ?? { amount: 0, currency: orderCurrency };
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

/**
 * Resolve catalog products for an order command.
 * Unknown ids become shipping:false stubs named `Missing product {id}` with price customPrice||0,
 * plus a PRODUCT_MISSING warning (order still created — D1).
 */
/** Prices are only comparable within one currency; a differing currency is itself a divergence. */
function samePrice(a: Price, b: Price): boolean {
	return a.currency === b.currency && Math.abs(a.amount - b.amount) < 1e-9;
}

export async function resolveProducts(
	items: OrderWriteCommand['items'],
	orderCurrency: Currency
): Promise<{ lines: ResolvedLine[]; warnings: ApiV1Warning[] }> {
	const ids = [...new Set(items.map((item) => item.productId))];
	const found = await collections.products.find({ _id: { $in: ids } }).toArray();
	const byId = new Map(found.map((product) => [product._id, product]));

	const warnings: ApiV1Warning[] = [];
	const lines: ResolvedLine[] = [];

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
		// The till is authoritative: it records what was actually charged. A batch uploaded
		// hours later must not be repriced by a catalogue that moved in between, and a
		// discount applied at the counter has no other way to reach us. What be-BOP would
		// have charged is reported as a warning rather than silently substituted.
		const customPrice = clientPrice ?? variationPrice;
		const expectedPrice = variationPrice ?? existing?.price;
		if (clientPrice && expectedPrice && !samePrice(clientPrice, expectedPrice)) {
			warnings.push({
				code: 'PRICE_OVERRIDE',
				message: `Price sent for ${item.productId} differs from the catalogue price`,
				productId: item.productId,
				details: {
					sent: { amount: clientPrice.amount, currency: clientPrice.currency },
					expected: { amount: expectedPrice.amount, currency: expectedPrice.currency },
					...(variationPrice && { basis: 'variations' })
				}
			});
		}
		const missing = !existing;
		if (missing) {
			warnings.push({
				code: 'PRODUCT_MISSING',
				message: `Product not found: ${item.productId}`,
				productId: item.productId
			});
		}
		lines.push({
			product: existing ?? stubMissingProduct(item.productId, clientPrice, orderCurrency),
			quantity: item.quantity,
			...(customPrice && { customPrice }),
			...(item.chosenVariations && { chosenVariations: item.chosenVariations }),
			...(item.uniqueKey && { uniqueKey: item.uniqueKey }),
			missing
		});
	}

	return { lines, warnings };
}
