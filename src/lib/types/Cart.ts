import type { RuntimeConfig } from '$lib/server/runtime-config';
import { sum } from '$lib/utils/sum';
import { toCurrency } from '$lib/utils/toCurrency';
import type { ObjectId } from 'mongodb';
import { vatRate, type CountryAlpha2 } from './Country';
import { UNDERLYING_CURRENCY, type Currency } from './Currency';
import type { Product } from './Product';
import type { Timestamps } from './Timestamps';
import type { UserIdentifier } from './UserIdentifier';
import type { DiscountType, Price } from './Order';
import { sumCurrency } from '$lib/utils/sumCurrency';
import { fixCurrencyRounding } from '$lib/utils/fixCurrencyRounding';
import { currencies } from '$lib/stores/currencies';
import { get } from 'svelte/store';
import type { User } from './User';
import { differenceInMinutes } from 'date-fns';

export interface Cart extends Timestamps {
	_id: ObjectId;
	user: UserIdentifier;

	items: Array<{
		/**
		 * Unique identifier for the line in the cart.
		 *
		 * Used for removing items from the cart.
		 *
		 * Only optional for backwards compatibility.
		 */
		_id?: string;
		productId: string;
		quantity: number;
		booking?: {
			start: Date;
			end: Date;
		};
		customPrice?: { amount: number; currency: Currency };
		reservedUntil?: Date;
		depositPercentage?: number;
		internalNote?: { value: string; updatedAt: Date; updatedById?: User['_id'] };
		chosenVariations?: Record<string, string>;
		freeQuantity?: number;
	}>;
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

type ItemForPriceInfo = {
	product: {
		shipping: boolean;
		price: Price;
		vatProfileId?: string | ObjectId;
		bookingSpec?: { slotMinutes: number };
	};
	quantity: number;
	customPrice?: Price;
	depositPercentage?: number;
	discountPercentage?: number;
	freeQuantity?: number;
	freeProductSources?: { subscriptionId: string; quantity: number }[];
	booking?: {
		start: Date;
		end: Date;
	};
};

function itemBasePrice(item: ItemForPriceInfo): Price {
	return item.customPrice || item.product.price;
}

type PriceToBillForItem = {
	amount: Price['amount'];
	currency: Price['currency'];
	quantityToAccount: number;
	quantityToBill: number;
};

function priceToBillForItem(item: ItemForPriceInfo): PriceToBillForItem {
	let quantityToAccount;
	if (item.booking) {
		if (item.quantity !== 1) {
			throw new Error('Booking slots can not be ordered multiple times.');
		} else if (!item.product.bookingSpec?.slotMinutes) {
			throw new Error('Item is a booking slot, but product is missing booking spec.');
		}
		quantityToAccount =
			differenceInMinutes(item.booking.end, item.booking.start) /
			item.product.bookingSpec.slotMinutes;
	} else {
		quantityToAccount = item.quantity;
	}
	const quantityToBill = Math.max(quantityToAccount - (item.freeQuantity ?? 0), 0);
	const discountFactor = (item.discountPercentage ?? 0) / 100;
	const basePrice = itemBasePrice(item);
	const amountToBill = fixCurrencyRounding(
		basePrice.amount * quantityToBill * (1 - discountFactor),
		basePrice.currency
	);
	return {
		amount: amountToBill,
		currency: basePrice.currency,
		quantityToAccount,
		quantityToBill
	};
}

export function computePriceInfo(
	items: Array<ItemForPriceInfo>,
	params: {
		vatExempted: boolean;
		vatNullOutsideSellerCountry: boolean;
		userCountry: CountryAlpha2 | undefined;
		bebopCountry: CountryAlpha2 | undefined;
		vatSingleCountry: boolean;
		deliveryFees: Price;
		vatProfiles: Array<{
			_id: string | ObjectId;
			rates: Partial<Record<CountryAlpha2, number>>;
		}>;
		discount?: {
			amount: number;
			type: DiscountType;
		} | null;
	}
): {
	physicalVatAtCustoms: boolean;
	partialPrice: number;
	partialVat: number;
	totalPrice: number;
	totalVat: number;
	totalPriceWithVat: number;
	partialPriceWithVat: number;
	discount: number;
	singleVatCountry: boolean;
	currency: Currency;
	/** Aggregate physical vat & digital vat when rates are the same or one is null */
	vat: Array<{
		price: Price;
		rate: number;
		country: CountryAlpha2;
		partialPrice: Price;
	}>;
	/** Vat rate for each individual item */
	vatRates: number[];
} {
	const isPhysicalVatExempted =
		params.vatNullOutsideSellerCountry && params.bebopCountry !== params.userCountry;
	const singleVatCountry = params.vatSingleCountry && !!params.bebopCountry;

	const vatForItem = (item: ItemForPriceInfo) => {
		if (params.vatExempted) {
			return undefined;
		}
		if (item.product.shipping && isPhysicalVatExempted) {
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
		const rate = vatProfile?.rates[country] ?? vatRate(country);
		const { amount: amountToBill, currency } = priceToBillForItem(item);
		const toDepositFactor = (item.depositPercentage ?? 100) / 100;
		const partialPrice = fixCurrencyRounding(amountToBill * toDepositFactor, currency);
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
			country
		};
	};

	const partialPrice = sumCurrency(UNDERLYING_CURRENCY, [
		...items.map((item) => {
			const toDepositFactor = (item.depositPercentage ?? 100) / 100;
			const { amount, currency } = priceToBillForItem(item);
			return {
				amount: amount * toDepositFactor,
				currency
			};
		}),
		params.deliveryFees
	]);
	const vat = items.map(vatForItem);
	const deliveryFeeVat = vatForItem({
		product: { shipping: true, price: params.deliveryFees },
		quantity: 1
	});

	const partialVat = sumCurrency(
		UNDERLYING_CURRENCY,
		[...vat, deliveryFeeVat].filter((p) => p !== undefined).map((vat) => vat.partialPrice)
	);
	const totalVat = sumCurrency(
		UNDERLYING_CURRENCY,
		[...vat, deliveryFeeVat].filter((p) => p !== undefined).map((vat) => vat.price)
	);
	const totalPrice = sumCurrency(UNDERLYING_CURRENCY, [
		...items.map(priceToBillForItem),
		params.deliveryFees
	]);

	let totalPriceWithVat = totalPrice + totalVat;
	let partialPriceWithVat = partialPrice + partialVat;
	let discountAmount = 0;

	if (params.discount) {
		const oldTotalPriceWithVat = totalPriceWithVat;
		if (params.discount.type === 'percentage') {
			const discount = (totalPriceWithVat * params.discount.amount) / 100;
			totalPriceWithVat = fixCurrencyRounding(
				Math.max(totalPriceWithVat - discount, 0),
				UNDERLYING_CURRENCY
			);
		} else {
			totalPriceWithVat = Math.max(
				sumCurrency(UNDERLYING_CURRENCY, [
					{ amount: totalPriceWithVat, currency: UNDERLYING_CURRENCY },
					{ amount: -params.discount.amount, currency: get(currencies).main }
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

	const vatRates = vat.map((vat) => vat?.rate ?? 0);
	const reducedVat: Array<{
		country: CountryAlpha2;
		rate: number;
		price: Price;
		partialPrice: Price;
	}> = [];

	for (const vatItem of [...vat, deliveryFeeVat]) {
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
		physicalVatAtCustoms: isPhysicalVatExempted,
		partialPrice,
		partialVat,
		totalPrice,
		totalVat,
		totalPriceWithVat,
		partialPriceWithVat,
		singleVatCountry,
		currency: UNDERLYING_CURRENCY,
		discount: discountAmount,
		vat: reducedVat.sort((a, b) => a.rate - b.rate),
		vatRates
	};
}
