import { currencies } from '$lib/stores/currencies';
import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding';
import { sum } from '$lib/utils/sum';
import { sumCurrency } from '$lib/utils/sumCurrency';
import { toCurrency } from '$lib/utils/toCurrency';
import type { RuntimeConfig } from './server/runtime-config';
import { vatRate, type CountryAlpha2 } from './types/Country';
import { UNDERLYING_CURRENCY, type Currency } from './types/Currency';
import type { DiscountType, Price } from './types/Order';
import type { Product } from './types/Product';
import { differenceInMinutes } from 'date-fns';
import type { ObjectId } from 'mongodb';
import { get } from 'svelte/store';

export type ProductForPriceInfo = {
	// The id is optional here, so we can compute prices for “products” that are
	// not in the database (e.g. delivery fees)
	_id?: string;
	shipping: boolean;
	price: Price;
	vatProfileId?: string | ObjectId;
	bookingSpec?: { slotMinutes: number };
};

export type ItemForPriceInfo = {
	booking?: { start: Date; end: Date };
	customPrice?: Price;
	depositPercentage?: number;
	discountPercentage?: number;
	freeProductSources?: { subscriptionId: string; quantity: number }[];
	product: ProductForPriceInfo;
	quantity: number;
};

type PriceToBillForItem = {
	amount: Price['amount'];
	amountWithoutDiscount: Price['amount'];
	currency: Price['currency'];
	unitsToAccount: number;
	unitsToBill: number;
	usedFreeUnits: number;
};

export function priceToBillForItem(
	item: ItemForPriceInfo,
	params: { freeUnits: number }
): PriceToBillForItem {
	let unitsToAccount;
	if (item.booking) {
		if (item.quantity !== 1) {
			throw new Error('Booking slots can not be ordered multiple times.');
		} else if (!item.product.bookingSpec?.slotMinutes) {
			throw new Error('Item is a booking slot, but product is missing booking spec.');
		}
		unitsToAccount =
			differenceInMinutes(item.booking.end, item.booking.start) /
			item.product.bookingSpec.slotMinutes;
	} else {
		unitsToAccount = item.quantity;
	}
	const unitsToBill = Math.max(unitsToAccount - params.freeUnits, 0);
	const discountFactor = (item.discountPercentage ?? 0) / 100;
	const basePrice = item.customPrice || item.product.price;
	// Don't round the amount without VAT - preserve storage precision (4 decimals)
	const amountWithoutDiscount = basePrice.amount * unitsToBill;
	// The amount to bill is computed independentlly from the amount without
	// discount because we don't want to use a rounded amount.
	const amountToBill = basePrice.amount * unitsToBill * (1 - discountFactor);

	return {
		amount: amountToBill,
		amountWithoutDiscount,
		currency: basePrice.currency,
		unitsToAccount,
		unitsToBill,
		usedFreeUnits: unitsToAccount - unitsToBill
	};
}

function computeCartPrice(
	items: ItemForPriceInfo[],
	params: {
		freeUnits?: Record<string, number>;
		deliveryFees?: Price;
	}
) {
	const freeUnits = structuredClone(params.freeUnits ?? {});
	const usedFreeUnits: Record<string, number> = Object();
	const amounts = [];
	const partialAmounts = [];
	const perItem = [];
	for (const item of items) {
		let priceToBill;
		if (item.product._id) {
			const productId = item.product._id;
			const availableFreeUnits = freeUnits[productId] ?? 0;
			priceToBill = priceToBillForItem(item, { freeUnits: availableFreeUnits });
			freeUnits[productId] = Math.max(0, availableFreeUnits - priceToBill.usedFreeUnits);
			usedFreeUnits[productId] = usedFreeUnits[productId] ?? 0 + priceToBill.usedFreeUnits;
		} else {
			priceToBill = priceToBillForItem(item, { freeUnits: 0 });
		}
		const { amount, currency } = priceToBill;
		amounts.push({ amount, currency });
		const depositFactor = (item.depositPercentage ?? 100) / 100;
		partialAmounts.push({ amount: amount * depositFactor, currency });
		perItem.push(priceToBill);
	}
	if (params.deliveryFees) {
		amounts.push({ amount: params.deliveryFees.amount, currency: params.deliveryFees.currency });
		partialAmounts.push({
			amount: params.deliveryFees.amount,
			currency: params.deliveryFees.currency
		});
	}
	return {
		cart: {
			currency: UNDERLYING_CURRENCY,
			partialAmount: sumCurrency(UNDERLYING_CURRENCY, partialAmounts),
			totalAmount: sumCurrency(UNDERLYING_CURRENCY, amounts)
		},
		perItem,
		usedFreeUnits
	};
}

function computeVatForItem(
	item: ItemForPriceInfo,
	params: {
		bebopCountry: CountryAlpha2 | undefined;
		freeUnits?: number;
		isPhysicalVatExempted: boolean;
		userCountry: CountryAlpha2 | undefined;
		vatExempted: boolean;
		vatProfiles: Array<{
			_id: string | ObjectId;
			rates: Partial<Record<CountryAlpha2, number>>;
		}>;
		vatSingleCountry: boolean;
	}
) {
	if (params.vatExempted || (item.product.shipping && params.isPhysicalVatExempted)) {
		return undefined;
	}
	const country = params.vatSingleCountry
		? params.bebopCountry
		: params.userCountry ?? params.bebopCountry;
	if (!country) {
		return undefined;
	}
	const vatProfile = item.product.vatProfileId
		? params.vatProfiles.find(
				(profile) => profile._id.toString() === item.product.vatProfileId?.toString()
		  )
		: undefined;
	const freeUnits = params.freeUnits ?? 0;
	const rate = vatProfile?.rates[country] ?? vatRate(country);
	const { amount: amountToBill, currency, usedFreeUnits } = priceToBillForItem(item, { freeUnits });
	const toDepositFactor = (item.depositPercentage ?? 100) / 100;
	// Don't round partialPrice - preserve precision for VAT calculation
	const partialPrice = amountToBill * toDepositFactor;
	const vatFactor = rate / 100;
	const vat = fixCurrencyRounding(amountToBill * vatFactor, currency);
	const partialVat = fixCurrencyRounding(partialPrice * vatFactor, currency);

	return {
		price: { amount: vat, currency },
		partialPrice: {
			amount: partialVat,
			currency
		},
		rate,
		country,
		usedFreeUnits
	};
}

function vatForCart(
	items: ItemForPriceInfo[],
	params: {
		bebopCountry: CountryAlpha2 | undefined;
		freeUnits?: Record<string, number>;
		isPhysicalVatExempted: boolean;
		usePartialPrice?: boolean;
		userCountry: CountryAlpha2 | undefined;
		vatExempted: boolean;
		vatProfiles: Array<{
			_id: string | ObjectId;
			rates: Partial<Record<CountryAlpha2, number>>;
		}>;
		vatSingleCountry: boolean;
	}
) {
	const freeUnits = structuredClone(params.freeUnits ?? {});
	const usedFreeUnits = Object();
	const vats = [];
	for (const item of items) {
		let vatForItem;
		if (item.product._id) {
			const availableFreeUnits = freeUnits[item.product._id] ?? 0;
			vatForItem = computeVatForItem(item, { ...params, freeUnits: availableFreeUnits });
			const usedFreeItems = vatForItem?.usedFreeUnits ?? 0;
			freeUnits[item.product._id] = Math.max(0, availableFreeUnits - usedFreeItems);
			usedFreeUnits[item.product._id] = usedFreeUnits[item.product._id] ?? 0 + usedFreeItems;
		} else {
			vatForItem = computeVatForItem(item, { ...params, freeUnits: 0 });
		}
		vats.push(vatForItem);
	}
	return { vats, usedFreeUnits };
}

export type CartPriceInfo = {
	currency: Currency;
	discount: number;
	partialPrice: number;
	partialPriceWithVat: number;
	partialVat: number;
	perItem: PriceToBillForItem[];
	physicalVatAtCustoms: boolean;
	singleVatCountry: boolean;
	totalPrice: number;
	totalPriceWithVat: number;
	totalVat: number;
	/** Aggregate physical vat & digital vat when rates are the same or one is null */
	vat: Array<{
		price: Price;
		rate: number;
		country: CountryAlpha2;
		partialPrice: Price;
	}>;
	/** Vat rate for each individual item */
	vatRates: number[];
};

export type CartDiscount = {
	type: DiscountType;
	amount: number;
};

/**
 * Ensures that a discount is within the bounds of the cart total.
 *
 * @param discount
 * @param cartTotal the max amount when the discount type is "fiat"
 */
function ensureDiscountWithinBounds(discount: CartDiscount, cartTotal: number): CartDiscount {
	switch (discount.type) {
		case 'fiat':
			return {
				type: discount.type,
				amount: Math.max(Math.min(discount.amount, cartTotal), 0)
			};
		case 'percentage':
			return {
				type: discount.type,
				amount: Math.max(Math.min(discount.amount, 100), 0)
			};
		default:
			discount.type satisfies never;
			throw new Error(`Invalid discount type: ${discount.type}`);
	}
}

/**
 * Computes different prices for cart-like objects.
 *
 * @param items
 * @param params Please mind the following notes:
 *        - If the specified discount is out of bounds, it will be adjusted to the nearest valid value.
 * @returns
 */
export function computePriceInfo(
	items: Array<ItemForPriceInfo>,
	params: {
		bebopCountry: CountryAlpha2 | undefined;
		deliveryFees: Price;
		discount?: CartDiscount;
		freeProductUnits: Record<string, number>;
		userCountry: CountryAlpha2 | undefined;
		vatExempted: boolean;
		vatNullOutsideSellerCountry: boolean;
		vatSingleCountry: boolean;
		vatProfiles: Array<{
			_id: string | ObjectId;
			rates: Partial<Record<CountryAlpha2, number>>;
		}>;
	}
): CartPriceInfo {
	const freeUnits = params.freeProductUnits;
	const isPhysicalVatExempted =
		params.vatNullOutsideSellerCountry && params.bebopCountry !== params.userCountry;
	const singleVatCountry = params.vatSingleCountry && !!params.bebopCountry;
	const cartPrice = computeCartPrice(items, {
		deliveryFees: params.deliveryFees,
		freeUnits
	});
	const { partialAmount: partialPrice, totalAmount: totalPrice } = cartPrice.cart;
	const cartVat = vatForCart(items, {
		...params,
		freeUnits,
		isPhysicalVatExempted
	});
	const deliveryFeeVat = computeVatForItem(
		{
			product: { shipping: true, price: params.deliveryFees },
			quantity: 1
		},
		{ ...params, freeUnits: 0, isPhysicalVatExempted }
	);

	const partialVat = sumCurrency(
		UNDERLYING_CURRENCY,
		[...cartVat.vats, deliveryFeeVat].filter((p) => p !== undefined).map((vat) => vat.partialPrice)
	);
	const totalVat = sumCurrency(
		UNDERLYING_CURRENCY,
		[...cartVat.vats, deliveryFeeVat].filter((p) => p !== undefined).map((vat) => vat.price)
	);

	let totalPriceWithVat = totalPrice + totalVat;
	let partialPriceWithVat = partialPrice + partialVat;
	let discountAmount = 0;

	if (params.discount) {
		const discount = ensureDiscountWithinBounds(params.discount, totalPriceWithVat);
		const oldTotalPriceWithVat = totalPriceWithVat;
		if (discount.type === 'percentage') {
			totalPriceWithVat = fixCurrencyRounding(
				Math.max((totalPriceWithVat * (100 - discount.amount)) / 100, 0),
				UNDERLYING_CURRENCY
			);
		} else {
			totalPriceWithVat = Math.max(
				sumCurrency(UNDERLYING_CURRENCY, [
					{ amount: totalPriceWithVat, currency: UNDERLYING_CURRENCY },
					{ amount: -discount.amount, currency: get(currencies).main }
				]),
				0
			);
		}
		discountAmount = oldTotalPriceWithVat - totalPriceWithVat;
		if (discountAmount) {
			partialPriceWithVat = fixCurrencyRounding(
				Math.max(
					partialPriceWithVat - (discountAmount * partialPriceWithVat) / oldTotalPriceWithVat,
					0
				),
				UNDERLYING_CURRENCY
			);
		}
	}

	const vatRates = cartVat.vats.map((vat) => vat?.rate ?? 0);
	const reducedVat: Array<{
		country: CountryAlpha2;
		rate: number;
		price: Price;
		partialPrice: Price;
	}> = [];

	for (const vatItem of [...cartVat.vats, deliveryFeeVat]) {
		if (!vatItem) {
			continue;
		}
		const existing = reducedVat.find(
			(v) => v.rate === vatItem.rate && v.country === vatItem.country
		);
		if (existing) {
			if (existing.price.currency !== vatItem.price.currency) {
				existing.price.amount = sumCurrency(UNDERLYING_CURRENCY, [
					{ amount: existing.price.amount, currency: existing.price.currency },
					{ amount: vatItem.price.amount, currency: vatItem.price.currency }
				]);
				existing.price.currency = UNDERLYING_CURRENCY;
				existing.partialPrice.amount = sumCurrency(UNDERLYING_CURRENCY, [
					{ amount: existing.partialPrice.amount, currency: existing.partialPrice.currency },
					{ amount: vatItem.partialPrice.amount, currency: vatItem.partialPrice.currency }
				]);
				existing.partialPrice.currency = UNDERLYING_CURRENCY;
			} else {
				existing.price.amount += vatItem.price.amount;
				existing.partialPrice.amount += vatItem.partialPrice.amount;
			}
		} else {
			reducedVat.push({
				country: vatItem.country,
				rate: vatItem.rate,
				price: vatItem.price,
				partialPrice: vatItem.partialPrice
			});
		}
	}

	return {
		currency: UNDERLYING_CURRENCY,
		discount: discountAmount,
		partialPrice,
		partialPriceWithVat,
		partialVat,
		perItem: cartPrice.perItem,
		physicalVatAtCustoms: isPhysicalVatExempted,
		singleVatCountry,
		totalPrice,
		totalPriceWithVat,
		totalVat,
		vat: reducedVat.sort((a, b) => a.rate - b.rate),
		vatRates
	};
}

export function computeDeliveryFees(
	currency: Currency,
	country: CountryAlpha2,
	items: Array<{
		product: Pick<
			Product,
			| 'price'
			| 'deliveryFees'
			| 'applyDeliveryFeesOnlyOnce'
			| 'shipping'
			| 'requireSpecificDeliveryFee'
		>;
		quantity: number;
	}>,
	deliveryFeesConfig: RuntimeConfig['deliveryFees']
) {
	items = items.filter(({ product }) => product.shipping);

	if (!items.length) {
		return 0;
	}

	if (deliveryFeesConfig.mode === 'flatFee' && !deliveryFeesConfig.applyFlatFeeToEachItem) {
		const cfg = deliveryFeesConfig.deliveryFees[country] || deliveryFeesConfig.deliveryFees.default;

		if (!cfg) {
			return NaN;
		}

		return toCurrency(currency, cfg.amount, cfg.currency);
	}

	const fees = items.map(({ product, quantity }) => {
		const cfg = (() => {
			const defaultConfig =
				deliveryFeesConfig.deliveryFees[country] || deliveryFeesConfig.deliveryFees.default;
			if (deliveryFeesConfig.mode === 'flatFee') {
				return defaultConfig;
			}

			let cfg = product.deliveryFees?.[country] || product.deliveryFees?.default;

			if (!product.requireSpecificDeliveryFee) {
				cfg ||= defaultConfig;
			}

			return cfg;
		})();

		if (!cfg) {
			return NaN;
		}

		return (
			toCurrency(currency, cfg.amount, cfg.currency) *
			(product.applyDeliveryFeesOnlyOnce ? 1 : quantity)
		);
	});

	if (fees.some((fee) => isNaN(fee))) {
		return NaN;
	}

	return deliveryFeesConfig.onlyPayHighest ? Math.max(...fees) : sum(fees);
}
