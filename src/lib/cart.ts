import { currencies } from '$lib/stores/currencies';
import { fixCurrencyRounding, roundDownToCurrency } from '$lib/utils/fixCurrencyRounding';
import { sum } from '$lib/utils/sum';
import { sumCurrency } from '$lib/utils/sumCurrency';
import { toCurrency } from '$lib/utils/toCurrency';
import type { RuntimeConfig } from './server/runtime-config';
import {
	normalizeMethod,
	type DeliveryFees,
	type DeliveryMethod,
	type DeliveryZone
} from './types/DeliveryFees';
import { type CountryAlpha2 } from './types/Country';
import { computeVatRate, extractVat } from './utils/vat';
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
	booking?: { start: Date; end: Date; bookedDates?: Date[] };
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
			item.booking.bookedDates?.length ??
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
	const rate = computeVatRate({
		productVatProfileId: item.product.vatProfileId,
		vatProfiles: params.vatProfiles,
		bebopCountry: params.bebopCountry,
		userCountry: params.userCountry,
		vatSingleCountry: params.vatSingleCountry
	});
	const freeUnits = params.freeUnits ?? 0;
	const { amount: amountToBill, currency, usedFreeUnits } = priceToBillForItem(item, { freeUnits });
	const toDepositFactor = (item.depositPercentage ?? 100) / 100;
	// Don't round partialPrice - preserve precision for VAT calculation
	const partialPrice = amountToBill * toDepositFactor;
	const vatFactor = rate / 100;

	// Don't round VAT - preserve precision for final calculation
	const vat = amountToBill * vatFactor;
	const partialVat = partialPrice * vatFactor;

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

/** Resolve delivery fees as a VAT-excluded (HT) Price, back-extracting from TTC if needed. */
function computeDeliveryFeesHt(params: {
	deliveryFees: Price;
	deliveryFeesVatProfileId?: string | null;
	deliveryFeesVatIncluded?: boolean;
	bebopCountry: CountryAlpha2 | undefined;
	userCountry: CountryAlpha2 | undefined;
	vatSingleCountry: boolean;
	vatProfiles: Array<{
		_id: string | ObjectId;
		rates: Partial<Record<CountryAlpha2, number>>;
	}>;
}): Price {
	if (!params.deliveryFeesVatIncluded) {
		return params.deliveryFees;
	}
	const rate = computeVatRate({
		productVatProfileId: params.deliveryFeesVatProfileId ?? undefined,
		vatProfiles: params.vatProfiles,
		bebopCountry: params.bebopCountry,
		userCountry: params.userCountry,
		vatSingleCountry: params.vatSingleCountry
	});
	return {
		amount: extractVat(params.deliveryFees.amount, rate),
		currency: params.deliveryFees.currency
	};
}

/** Percentage discounts round DOWN — a smaller-than-stated discount can be illegal. */
function applyCartDiscount(params: {
	discount: CartDiscount;
	totalPriceWithVat: number;
	partialPriceWithVat: number;
}): { totalPriceWithVat: number; partialPriceWithVat: number; discountAmount: number } {
	const discount = ensureDiscountWithinBounds(params.discount, params.totalPriceWithVat);
	const oldTotalPriceWithVat = params.totalPriceWithVat;
	let totalPriceWithVat: number;
	if (discount.type === 'percentage') {
		const main = get(currencies).main;
		const totalInMain = toCurrency(
			main,
			Math.max((oldTotalPriceWithVat * (100 - discount.amount)) / 100, 0),
			UNDERLYING_CURRENCY
		);
		totalPriceWithVat = toCurrency(
			UNDERLYING_CURRENCY,
			roundDownToCurrency(totalInMain, main),
			main
		);
	} else {
		totalPriceWithVat = Math.max(
			sumCurrency(UNDERLYING_CURRENCY, [
				{ amount: oldTotalPriceWithVat, currency: UNDERLYING_CURRENCY },
				{ amount: -discount.amount, currency: get(currencies).main }
			]),
			0
		);
	}
	const discountAmount = oldTotalPriceWithVat - totalPriceWithVat;
	let partialPriceWithVat = params.partialPriceWithVat;
	if (discountAmount) {
		partialPriceWithVat = fixCurrencyRounding(
			Math.max(
				partialPriceWithVat - (discountAmount * partialPriceWithVat) / oldTotalPriceWithVat,
				0
			),
			UNDERLYING_CURRENCY
		);
	}
	return { totalPriceWithVat, partialPriceWithVat, discountAmount };
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
		/** null = shop standard VAT; otherwise a VAT profile id (hex ObjectId string). */
		deliveryFeesVatProfileId?: string | null;
		/** true = `deliveryFees.amount` is VAT-included (TTC). */
		deliveryFeesVatIncluded?: boolean;
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

	// Resolve HT before computeCartPrice so subtotal and VAT use the same base.
	const deliveryFeesHt = computeDeliveryFeesHt({
		deliveryFees: params.deliveryFees,
		deliveryFeesVatProfileId: params.deliveryFeesVatProfileId,
		deliveryFeesVatIncluded: params.deliveryFeesVatIncluded,
		bebopCountry: params.bebopCountry,
		userCountry: params.userCountry,
		vatSingleCountry: params.vatSingleCountry,
		vatProfiles: params.vatProfiles
	});

	const cartPrice = computeCartPrice(items, {
		deliveryFees: deliveryFeesHt,
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
			product: {
				shipping: true,
				price: deliveryFeesHt,
				vatProfileId: params.deliveryFeesVatProfileId ?? undefined
			},
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
		const discounted = applyCartDiscount({
			discount: params.discount,
			totalPriceWithVat,
			partialPriceWithVat
		});
		totalPriceWithVat = discounted.totalPriceWithVat;
		partialPriceWithVat = discounted.partialPriceWithVat;
		discountAmount = discounted.discountAmount;
	}

	// Round final prices to display precision (2 decimals for fiat)
	totalPriceWithVat = fixCurrencyRounding(totalPriceWithVat, UNDERLYING_CURRENCY);
	partialPriceWithVat = fixCurrencyRounding(partialPriceWithVat, UNDERLYING_CURRENCY);

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

	// Round each VAT rate once — never sum line-level rounded values.
	for (const v of reducedVat) {
		v.price.amount = fixCurrencyRounding(v.price.amount, v.price.currency);
		v.partialPrice.amount = fixCurrencyRounding(v.partialPrice.amount, v.partialPrice.currency);
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

function pickMethodFee(
	fee: { amount: number; currency: Currency; methods?: DeliveryMethod[] },
	selectedMethod: string | undefined
): { amount: number; currency: Currency } {
	if (selectedMethod && fee.methods?.length) {
		const target = normalizeMethod(selectedMethod);
		const matched = fee.methods.find((method) => normalizeMethod(method.label) === target);
		if (matched) {
			return { amount: matched.amount, currency: matched.currency };
		}
	}
	return { amount: fee.amount, currency: fee.currency };
}

export function resolveDeliveryMethodLabel(
	entry: { methods?: DeliveryMethod[] } | undefined,
	selectedMethod: string | undefined
): string | undefined {
	if (!selectedMethod || normalizeMethod(selectedMethod) === 'default') {
		return undefined;
	}
	const target = normalizeMethod(selectedMethod);
	return entry?.methods?.find((method) => normalizeMethod(method.label) === target)?.label;
}

// Exported so the checkout client lists the same delivery methods the server will charge.
export function resolveFeeEntry(
	deliveryFees: DeliveryFees,
	deliveryZones: DeliveryZone[] | undefined,
	defaultBlacklist: CountryAlpha2[] | undefined,
	country: CountryAlpha2
): { amount: number; currency: Currency; methods?: DeliveryMethod[] } | undefined {
	const explicit = deliveryFees[country];
	if (explicit) {
		return explicit;
	}
	// Disabled zones are kept as importable templates only — skip them in resolution.
	const zone = deliveryZones?.find((z) => z.enabled !== false && z.countries.includes(country));
	if (zone) {
		return zone;
	}
	if (defaultBlacklist?.includes(country)) {
		return undefined;
	}
	return deliveryFees.default;
}

function resolveDeliveryFee(
	deliveryFees: DeliveryFees,
	deliveryZones: DeliveryZone[] | undefined,
	defaultBlacklist: CountryAlpha2[] | undefined,
	country: CountryAlpha2,
	selectedMethod?: string
): { amount: number; currency: Currency } | undefined {
	const entry = resolveFeeEntry(deliveryFees, deliveryZones, defaultBlacklist, country);
	return entry ? pickMethodFee(entry, selectedMethod) : undefined;
}

export function computeDeliveryFees(
	currency: Currency,
	country: CountryAlpha2,
	items: Array<{
		product: Pick<
			Product,
			| 'price'
			| 'deliveryFees'
			| 'deliveryZones'
			| 'defaultBlacklist'
			| 'applyDeliveryFeesOnlyOnce'
			| 'shipping'
			| 'requireSpecificDeliveryFee'
		>;
		quantity: number;
	}>,
	deliveryFeesConfig: RuntimeConfig['deliveryFees'],
	selectedMethod?: string
): number {
	items = items.filter(({ product }) => product.shipping);

	if (!items.length) {
		return 0;
	}

	if (deliveryFeesConfig.mode === 'flatFee' && !deliveryFeesConfig.applyFlatFeeToEachItem) {
		const cfg = resolveDeliveryFee(
			deliveryFeesConfig.deliveryFees,
			deliveryFeesConfig.deliveryZones,
			deliveryFeesConfig.defaultBlacklist,
			country,
			selectedMethod
		);

		if (!cfg) {
			return NaN;
		}

		return toCurrency(currency, cfg.amount, cfg.currency);
	}

	const fees = items.map(({ product, quantity }) => {
		const cfg = (() => {
			const defaultConfig = resolveDeliveryFee(
				deliveryFeesConfig.deliveryFees,
				deliveryFeesConfig.deliveryZones,
				deliveryFeesConfig.defaultBlacklist,
				country,
				selectedMethod
			);
			if (deliveryFeesConfig.mode === 'flatFee') {
				return defaultConfig;
			}

			let cfg = resolveDeliveryFee(
				product.deliveryFees ?? {},
				product.deliveryZones,
				product.defaultBlacklist,
				country,
				selectedMethod
			);

			if (!product.requireSpecificDeliveryFee && !product.defaultBlacklist?.includes(country)) {
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
