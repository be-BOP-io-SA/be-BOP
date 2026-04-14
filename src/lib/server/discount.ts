import { isAlpha2CountryCode, type CountryAlpha2 } from '$lib/types/Country';
import type { Discount, DiscountChannel, ProductCombination } from '$lib/types/Discount';
import type { Product } from '$lib/types/Product';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import { error } from '@sveltejs/kit';
import { ALL_PAYMENT_METHODS, type PaymentMethod } from './payment-methods';
import { collections } from './database';

const ALL_DISCOUNT_CHANNELS: readonly DiscountChannel[] = [
	'web',
	'web-pos',
	'pos-touch',
	'nostr-bot'
];

export interface DiscountContext {
	userSubscriptionIds: string[];
	promoCode?: string;
	channel?: DiscountChannel;
	paymentMethod?: PaymentMethod;
	deliveryCountry?: CountryAlpha2;
	billingCountry?: CountryAlpha2;
	userContactAddresses: string[];
	cartItems: Array<{ productId: string; quantity: number; tagIds?: string[] }>;
	isLoggedIn: boolean;
}

/**
 * Fetch all currently active percentage discounts (filtered by date in Mongo).
 * freeProducts discounts stay subscription-only (Q4) and are NOT included.
 */
export async function getActivePercentageDiscounts(): Promise<Discount[]> {
	const now = new Date();
	return collections.discounts
		.find({
			beginsAt: { $lte: now },
			mode: 'percentage',
			$or: [{ endsAt: { $gt: now } }, { endsAt: null }]
		})
		.toArray();
}

/**
 * Evaluate whether a discount's AND-conditions match the given context.
 * Each non-empty condition must pass. Empty/undefined = "true" (no filter).
 */
export function evaluateDiscountConditions(discount: Discount, ctx: DiscountContext): boolean {
	if (
		discount.subscriptionIds?.length &&
		!discount.subscriptionIds.some((id) => ctx.userSubscriptionIds.includes(id))
	) {
		return false;
	}

	if (discount.promoCode && discount.promoCode.toLowerCase() !== ctx.promoCode?.toLowerCase()) {
		return false;
	}

	if (discount.channels?.length && ctx.channel && !discount.channels.includes(ctx.channel)) {
		return false;
	}

	if (discount.paymentMethods?.length) {
		if (!ctx.paymentMethod || !discount.paymentMethods.includes(ctx.paymentMethod)) {
			return false;
		}
	}

	// Delivery and billing country are independent AND-conditions
	if (discount.deliveryCountry && discount.deliveryCountry !== ctx.deliveryCountry) {
		return false;
	}
	if (discount.billingCountry && discount.billingCountry !== ctx.billingCountry) {
		return false;
	}

	if (discount.contactAddresses?.length) {
		if (!ctx.isLoggedIn) {
			return false;
		}
		const normalizedRequired = discount.contactAddresses.map((a) => a.toLowerCase());
		const normalizedUser = ctx.userContactAddresses.map((a) => a.toLowerCase());
		const matchesAddress = normalizedRequired.some((addr) => {
			// Wildcard `npub*` matches any Nostr-authenticated user.
			// Reject lookalikes such as `npubcool@gmail.com` (no `npub1` prefix)
			// or `npub1xyz@example.com` (contains `@`).
			if (addr === 'npub*') {
				return normalizedUser.some((u) => u.startsWith('npub1') && !u.includes('@'));
			}
			return normalizedUser.includes(addr);
		});
		if (!matchesAddress) {
			return false;
		}
	}

	if (discount.productCombinations?.length) {
		const hasMatchingCombo = discount.productCombinations.some((combo) =>
			combo.products.every((req) => {
				const cartItem = ctx.cartItems.find((i) => i.productId === req.productId);
				return cartItem && cartItem.quantity >= req.quantity;
			})
		);
		if (!hasMatchingCombo) {
			return false;
		}
	}

	return true;
}

interface SelectBestItem {
	product: Pick<Product, '_id' | 'price' | 'tagIds'>;
	quantity: number;
	customPrice?: { amount: number };
}

type PercentageDiscount = Discount & { mode: 'percentage' };

interface DiscountSavings {
	discount: PercentageDiscount;
	discountByProduct: Map<string, number>;
	totalSaved: number;
}

/**
 * True if the discount targets a given product — either via wholeCatalog,
 * an explicit productIds entry, or any of the requiredTagIds matching the
 * product's tags. Single source of truth for application-side eligibility
 * (the equivalent Mongo $or in fetchApplicableDiscount must stay in sync).
 */
export function discountTargetsProduct(
	discount: Pick<Discount, 'wholeCatalog' | 'productIds' | 'requiredTagIds'>,
	product: { _id: string; tagIds?: string[] }
): boolean {
	if (discount.wholeCatalog) {
		return true;
	}
	if (discount.productIds.includes(product._id)) {
		return true;
	}
	return discount.requiredTagIds?.some((t) => product.tagIds?.includes(t)) ?? false;
}

/** Compute savings for one discount applied to all eligible items in the cart */
function computeDiscountSavings(
	discount: PercentageDiscount,
	items: SelectBestItem[]
): DiscountSavings {
	const eligibleItems = items.filter((item) =>
		discountTargetsProduct(discount, { _id: item.product._id, tagIds: item.product.tagIds })
	);

	const discountByProduct = new Map(
		eligibleItems.map((item) => [item.product._id, discount.percentage])
	);

	const totalSaved = eligibleItems.reduce((sum, item) => {
		const basePrice = (item.customPrice?.amount ?? item.product.price.amount) * item.quantity;
		return sum + basePrice * (discount.percentage / 100);
	}, 0);

	return { discount, discountByProduct, totalSaved };
}

/**
 * Among all applicable discounts, pick the one with highest total savings across
 * the entire order. Returns null if no discount applies. (one discount per order, no stacking)
 */
export function selectBestDiscount(
	discounts: Discount[],
	items: SelectBestItem[],
	context: DiscountContext
): { discount: Discount; discountByProduct: Map<string, number> } | null {
	const best = discounts
		.filter(
			(d): d is PercentageDiscount =>
				d.mode === 'percentage' && evaluateDiscountConditions(d, context)
		)
		.map((d) => computeDiscountSavings(d, items))
		.filter((result) => result.totalSaved > 0)
		.reduce<DiscountSavings | null>(
			(currentBest, result) =>
				!currentBest || result.totalSaved > currentBest.totalSaved ? result : currentBest,
			null
		);

	return best ? { discount: best.discount, discountByProduct: best.discountByProduct } : null;
}

/**
 * Determine the web sales channel for a user (web vs web-pos).
 * /pos/touch and nostr-bot routes pass their channel literal directly.
 */
export function webChannelForUser(hasPosOptions?: boolean): DiscountChannel {
	return hasPosOptions ? 'web-pos' : 'web';
}

/** Check if a string looks like an email (for treating login-as-email) */
function looksLikeEmail(s?: string): boolean {
	return !!s && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

/** Mongo filter for active percentage discounts within their date window */
function activePercentageDiscountFilter(now: Date) {
	return {
		beginsAt: { $lte: now },
		mode: 'percentage' as const,
		$or: [{ endsAt: { $gt: now } }, { endsAt: null }]
	};
}

/**
 * Find an active percentage discount matching the given promo code (case-insensitive).
 * Returns null if no match.
 */
export async function findActivePromoDiscount(promoCode: string): Promise<Discount | null> {
	return collections.discounts.findOne(
		{
			...activePercentageDiscountFilter(new Date()),
			promoCode
		},
		{ collation: { locale: 'en', strength: 2 } }
	);
}

/** True if there is at least one active percentage discount with a non-empty promo code */
export async function hasAnyActivePromoDiscount(): Promise<boolean> {
	const count = await collections.discounts.countDocuments(
		{
			...activePercentageDiscountFilter(new Date()),
			promoCode: { $exists: true, $ne: '' }
		},
		{ limit: 1 }
	);
	return count > 0;
}

export interface DiscountConditionFields {
	promoCode?: string;
	channels?: DiscountChannel[];
	paymentMethods?: PaymentMethod[];
	deliveryCountry?: CountryAlpha2;
	billingCountry?: CountryAlpha2;
	contactAddresses?: string[];
	requiredTagIds?: string[];
	productCombinations?: ProductCombination[];
	showBadge: boolean;
	showExpirationBanner: boolean;
}

/** Parse product combinations from formData ("combinations[i][j][productId|quantity]") */
export function parseProductCombinations(formData: FormData): ProductCombination[] {
	// Parsing sparse nested form fields is naturally imperative
	const raw: ProductCombination[] = [];
	for (const [key, value] of formData.entries()) {
		const match = key.match(/^combinations\[(\d+)]\[(\d+)]\[(productId|quantity)]$/);
		if (!match) {
			continue;
		}
		const comboIndex = Number(match[1]);
		const productIndex = Number(match[2]);
		const field = match[3];
		if (!raw[comboIndex]) {
			raw[comboIndex] = { products: [] };
		}
		if (!raw[comboIndex].products[productIndex]) {
			raw[comboIndex].products[productIndex] = { productId: '', quantity: 1 };
		}
		if (field === 'productId') {
			raw[comboIndex].products[productIndex].productId = String(value);
		} else {
			raw[comboIndex].products[productIndex].quantity = Number(value);
		}
	}
	return raw
		.filter((c) => c?.products?.length)
		.map((c) => ({ products: c.products.filter((p) => p?.productId) }))
		.filter((c) => c.products.length);
}

/**
 * Parse all discount condition fields from a discount admin form.
 * Throws 400 on invalid country/channel/paymentMethod values.
 */
export function parseDiscountConditionFields(formData: FormData): DiscountConditionFields {
	const promoCode = String(formData.get('promoCode') ?? '').trim() || undefined;

	const channelsRaw = formData.getAll('channels').map(String).filter(Boolean);
	const invalidChannel = channelsRaw.find(
		(c) => !ALL_DISCOUNT_CHANNELS.includes(c as DiscountChannel)
	);
	if (invalidChannel) {
		throw error(400, `Invalid discount channel: ${invalidChannel}`);
	}
	const channels = channelsRaw.length ? (channelsRaw as DiscountChannel[]) : undefined;

	const paymentMethodsRaw = formData.getAll('paymentMethods').map(String).filter(Boolean);
	const invalidPaymentMethod = paymentMethodsRaw.find(
		(pm) => !ALL_PAYMENT_METHODS.includes(pm as PaymentMethod)
	);
	if (invalidPaymentMethod) {
		throw error(400, `Invalid payment method: ${invalidPaymentMethod}`);
	}
	const paymentMethods = paymentMethodsRaw.length
		? (paymentMethodsRaw as PaymentMethod[])
		: undefined;

	const parseOptionalCountry = (field: string, label: string): CountryAlpha2 | undefined => {
		const raw = String(formData.get(field) ?? '');
		if (!raw || raw === 'none') {
			return undefined;
		}
		if (!isAlpha2CountryCode(raw)) {
			throw error(400, `Invalid ${label} country: ${raw}`);
		}
		return raw;
	};
	const deliveryCountry = parseOptionalCountry('deliveryCountry', 'delivery');
	const billingCountry = parseOptionalCountry('billingCountry', 'billing');

	const contactAddressesRaw = String(formData.get('contactAddresses') ?? '')
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean);
	const contactAddresses = contactAddressesRaw.length ? contactAddressesRaw : undefined;

	const requiredTagIdsRaw = JSON.parse(String(formData.get('requiredTagIds') ?? '[]')) as Array<{
		value: string;
	}>;
	const requiredTagIds = requiredTagIdsRaw.map((x) => x.value);

	const productCombinations = parseProductCombinations(formData);

	return {
		...(promoCode && { promoCode }),
		...(channels && { channels }),
		...(paymentMethods && { paymentMethods }),
		...(deliveryCountry && { deliveryCountry }),
		...(billingCountry && { billingCountry }),
		...(contactAddresses && { contactAddresses }),
		...(requiredTagIds.length && { requiredTagIds }),
		...(productCombinations.length && { productCombinations }),
		showBadge: formData.get('showBadge') === 'on',
		showExpirationBanner: formData.get('showExpirationBanner') === 'on'
	};
}

/**
 * True if the user has any form of authenticated identity (not just a form field).
 * Covers: admin/POS users (userId), magic-link email sessions, Nostr sessions, SSO.
 */
export function isAuthenticated(user?: UserIdentifier | null): boolean {
	if (!user) {
		return false;
	}
	return !!(user.userId || user.email || user.npub || user.ssoIds?.length);
}

/** Collect all contact addresses (email, npub, phone) for a user identifier */
export function collectUserAddresses(user?: UserIdentifier | null): string[] {
	if (!user) {
		return [];
	}
	const loginAsEmail = looksLikeEmail(user.userLogin) ? user.userLogin : undefined;
	return [
		...(user.email ? [user.email] : []),
		...(user.secondaryEmails ?? []),
		...(user.npub ? [user.npub] : []),
		// Login can be an email for POS users
		...(loginAsEmail ? [loginAsEmail] : []),
		...(user.userRecoveryEmail ? [user.userRecoveryEmail] : [])
	];
}
