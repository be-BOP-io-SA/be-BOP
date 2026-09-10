import type { LanguageKey } from '$lib/translations';
import type { ObjectId } from 'mongodb';
import type { DeliveryFees } from './DeliveryFees';
import type { Price } from './Order';
import type { ProductActionSettings } from './ProductActionSettings';
import type { Tag } from './Tag';
import type { Timestamps } from './Timestamps';
import type { PaymentMethod } from '$lib/server/payment-methods';
import { sumCurrency } from '$lib/utils/sumCurrency';
import type { PickDeep } from 'type-fest';
import type { SubscriptionDuration } from './SubscriptionDuration';

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
	price: Price;
	stock?: {
		available: number;
		total: number;
		reserved: number;
	};
	stockReference?: {
		productId: string;
	};
	vatProfileId?: ObjectId;
	maxQuantityPerOrder?: number;
	type: 'subscription' | 'resource' | 'donation';
	subscriptionDuration?: SubscriptionDuration;
	subscriptionReminderSeconds?: number;
	pricingSchedule?: Array<{
		value: number;
		unit: SubscriptionDuration;
		priceAmount: number;
		reminderValue: number;
		reminderUnit: SubscriptionDuration;
	}>;
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
		/** Maximum number of calendar days selectable in a date range booking. 0 or undefined = unlimited. */
		maxBookableDays?: number;
		/**
		 * Whether the customer can book the current day. Only honored when slotMinutes is a full day
		 * (24h). Defaults to false: today is not selectable. When true, see sameDayBookingMaxHour.
		 */
		allowSameDayBooking?: boolean;
		/**
		 * HH:mm cutoff (in the schedule's timezone) past which today is no longer bookable, when
		 * allowSameDayBooking is true. Defaults to "14:00".
		 */
		sameDayBookingMaxHour?: string;
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
	/**
	 * Per-family display options, keyed by the family id used in `variations[].name`.
	 * A family absent from this record behaves as it always has: a dropdown on the product
	 * page, and the chosen value shown to the customer.
	 */
	variationFamilies?: Record<
		string,
		{
			/** No dropdown on the product page. The value can then only come from the URL. */
			hiddenFromUI?: boolean;
			/** Never shown to the customer: cart, mini-cart, add-to-cart popup, order summary. */
			hiddenFromCustomer?: boolean;
		}
	>;
	/**
	 * What to do when the URL asks for a variation the product does not have, or leaves a
	 * family hidden from the product page unset. `error` refuses the page; `ignore` drops the
	 * bad parameter and falls back to a dropdown. Defaults to `error`.
	 */
	variationUrlPolicy?: 'error' | 'ignore';
	hasSellDisclaimer?: boolean;
	hideFromSEO?: boolean;
	event?: {
		beginsAt: Date;
		endsAt: Date;
	};
	/**
	 * Optional outbound webhook fired once the order containing this product transitions to
	 * paid. Receiver verifies the request via an HMAC-SHA256 signature of the raw body using
	 * `secret` as the key, transmitted in `X-Webhook-Signature: sha256=<hex>`. Fire-and-forget:
	 * a network or 5xx failure is logged but not retried (issue #2646 is a PoC).
	 */
	paidOrderWebhook?: {
		apiRoute: string;
		secret: string;
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

export type VariationUrlError =
	| { reason: 'unknownFamily'; family: string }
	| { reason: 'unknownValue'; family: string; value: string }
	| { reason: 'missingHiddenFamily'; family: string };

/**
 * Reads variation choices off the query string: `?color=red&size=xxl`. The family is the id
 * held in `variations[].name`, the value the id held in `variations[].value`.
 *
 * A family whose value comes from the URL loses its dropdown — the choice is already made.
 * A family flagged `hiddenFromUI` has no dropdown at all, so the URL is its only source;
 * leaving it unset is reported rather than silently yielding an unbuyable product.
 *
 * Only parameters naming a family the shop declared are judged. Anything else on the query
 * string — a campaign tag, a tracking id — is none of this function's business, and treating
 * it as a bad variation would make every marketing link break the product page.
 */
export function resolveVariationsFromUrl(
	product: Pick<Product, 'variations' | 'variationFamilies'>,
	searchParams: URLSearchParams
): { forced: Record<string, string>; errors: VariationUrlError[] } {
	const families = new Map<string, Set<string>>();
	for (const variation of product.variations ?? []) {
		const values = families.get(variation.name) ?? new Set<string>();
		values.add(variation.value);
		families.set(variation.name, values);
	}

	const forced: Record<string, string> = {};
	const errors: VariationUrlError[] = [];

	for (const [family, value] of searchParams) {
		const values = families.get(family);
		if (!values) {
			if (product.variationFamilies?.[family]) {
				errors.push({ reason: 'unknownFamily', family });
			}
			continue;
		}
		if (!values.has(value)) {
			errors.push({ reason: 'unknownValue', family, value });
			continue;
		}
		forced[family] = value;
	}

	for (const family of families.keys()) {
		if (product.variationFamilies?.[family]?.hiddenFromUI && !(family in forced)) {
			errors.push({ reason: 'missingHiddenFamily', family });
		}
	}

	return { forced, errors };
}

/**
 * Product name suffixed with the chosen variations the customer is allowed to see.
 *
 * Shared by every customer-facing listing so that a family hidden from the cart is hidden
 * from all of them at once: cart, mini-cart, add-to-cart popup, order summary.
 */
export function productLabelWithVariations(
	product: Pick<Product, 'name' | 'variationLabels' | 'variationFamilies'>,
	chosenVariations: Record<string, string> | undefined
): string {
	if (!chosenVariations) {
		return product.name;
	}
	const shown = Object.entries(chosenVariations)
		.filter(([family]) => !product.variationFamilies?.[family]?.hiddenFromCustomer)
		.map(([family, value]) => product.variationLabels?.values[family]?.[value] ?? value);

	return shown.length ? `${product.name} - ${shown.join(' - ')}` : product.name;
}
