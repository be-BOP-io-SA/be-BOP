import type { LanguageKey } from '$lib/translations';
import type { ObjectId } from 'mongodb';
import type { Currency } from './Currency';
import type { DeliveryFees } from './DeliveryFees';
import type { Price } from './Order';
import type { ProductActionSettings } from './ProductActionSettings';
import type { Tag } from './Tag';
import type { Timestamps } from './Timestamps';
import type { PaymentMethod } from '$lib/server/payment-methods';
import { sumCurrency } from '$lib/utils/sumCurrency';
import type { PickDeep } from 'type-fest';

export interface ProductTranslatableFields {
	name: string;
	description: string;
	shortDescription: string;
	customPreorderText?: string;
	cta?: {
		label: string;
		href: string;
		fallback?: boolean;
		downloadLink?: string;
	}[];
	externalResources?: {
		label: string;
		href: string;
	}[];
	variationLabels?: {
		names: Record<string, string>;
		values: Record<string, Record<string, string>>;
	};
	contentBefore?: string;
	contentAfter?: string;
	sellDisclaimer?: {
		title: string;
		reason: string;
	};
}

export interface Product extends Timestamps, ProductTranslatableFields {
	_id: string;
	alias: string[];
	price: {
		amount: number;
		currency: Currency;
	};
	stock?: {
		available: number;
		total: number;
		reserved: number;
	};
	vatProfileId?: ObjectId;
	maxQuantityPerOrder?: number;
	type: 'subscription' | 'resource' | 'donation';
	shipping: boolean;
	deliveryFees?: DeliveryFees;
	requireSpecificDeliveryFee?: boolean;
	applyDeliveryFeesOnlyOnce?: boolean;
	isTicket: boolean;
	bookingSpec?: {
		/**
		 * Number of minutes for the price of the product.
		 */
		slotMinutes: number;
		schedule: {
			timezone: string; // eg "Europe/Berlin"
			monday: {
				start: string; // eg "09:00"
				end: string; // eg "17:00"
			} | null;
			tuesday: {
				start: string; // eg "09:00"
				end: string; // eg "17:00"
			} | null;
			wednesday: {
				start: string; // eg "09:00"
				end: string; // eg "17:00"
			} | null;
			thursday: {
				start: string; // eg "09:00"
				end: string; // eg "17:00"
			} | null;
			friday: {
				start: string; // eg "09:00"
				end: string; // eg "17:00"
			} | null;
			saturday: {
				start: string; // eg "09:00"
				end: string; // eg "17:00"
			} | null;
			sunday: {
				start: string; // eg "09:00"
				end: string; // eg "17:00"
			} | null;
		};
	};
	availableDate?: Date;
	preorder: boolean;
	displayShortDescription: boolean;
	hideDiscountExpiration: boolean;
	deposit?: {
		percentage: number;
		/**
		 * If this is true, the product can not be paid in full immediately
		 */
		enforce: boolean;
	};
	/**
	 * Setting this to true will also set standalone to true
	 */
	payWhatYouWant: boolean;
	recommendedPWYWAmount?: number;
	/**
	 * One line per item in a cart, eg for large products
	 */
	standalone: boolean;
	free: boolean;
	actionSettings: ProductActionSettings;
	tagIds?: Tag['_id'][];
	maximumPrice?: Price;
	translations?: Partial<Record<LanguageKey, Partial<ProductTranslatableFields>>>;
	/**
	 * The product can only be bought with the specified payment methods
	 */
	paymentMethods?: PaymentMethod[];
	mobile?: {
		hideContentBefore: boolean;
		hideContentAfter: boolean;
	};
	hasVariations?: boolean;
	variations?: {
		name: string;
		value: string;
		price?: number;
	}[];
	hasSellDisclaimer?: boolean;
	hideFromSEO?: boolean;
	event?: {
		beginsAt: Date;
		endsAt: Date;
	};
}

export type BasicProductFrontend = Pick<Product, '_id' | 'price' | 'name' | 'variationLabels'>;

export const MAX_NAME_LIMIT = 70;

export const MAX_SHORT_DESCRIPTION_LIMIT = 160;
export const MAX_DESCRIPTION_LIMIT = 10000;

export const DEFAULT_MAX_QUANTITY_PER_ORDER = 10;
export const POS_PRODUCT_PAGINATION = 10;
export const PRODUCT_PAGINATION_LIMIT = 25;

export function isPreorder(
	availableDate: Date | undefined,
	preorder: boolean | undefined
): boolean {
	return !!(preorder && availableDate && availableDate > new Date());
}

export function oneMaxPerLine(
	p: PickDeep<Product, 'standalone' | 'type' | 'bookingSpec.slotMinutes'>
) {
	return p.standalone || p.type === 'subscription' || p.bookingSpec;
}
export function productPriceWithVariations(
	product: Pick<Product, 'name' | '_id' | 'price' | 'variations'>,
	chosenVariations: Record<string, string> | undefined
) {
	const variationPriceArray: Price[] = chosenVariations
		? Object.entries(chosenVariations).map((variation) => ({
				amount:
					product.variations?.find(
						(vari) => variation[0] === vari.name && variation[1] === vari.value
					)?.price ?? 0,
				currency: product.price.currency
		  }))
		: [];

	return sumCurrency(product.price.currency, [...variationPriceArray, product.price]);
}

export function checkProductVariationsIntegrity(
	product: Pick<Product, 'name' | '_id' | 'price' | 'variations'>,
	chosenVariations: Record<string, string> | undefined
) {
	const variationNamesInDB = [...new Set(product.variations?.map((vari) => vari.name))];
	const chosenVariationNames = Object.keys(chosenVariations ?? {});
	const allVariationsChosen =
		variationNamesInDB.length === chosenVariationNames.length &&
		variationNamesInDB.every((name) => chosenVariationNames.includes(name));

	return allVariationsChosen;
}
