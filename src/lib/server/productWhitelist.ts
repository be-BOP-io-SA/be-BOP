import type { Product } from '$lib/types/Product';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { collections } from './database';
import { collectUserAddresses } from './discount';
import { userQuery } from './user';

export type ProductWhitelist = NonNullable<Product['whitelist']>;

function normalizeAddress(address: string): string {
	return address.trim().toLowerCase();
}

function splitLines(value: string): string[] {
	return value
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

/**
 * Turns the admin form fields into the stored whitelist, or undefined when the product is left
 * open to everyone. The two text areas hold one address per line, like the contact addresses of
 * a discount.
 */
export function buildProductWhitelist(fields: {
	hasWhitelist: boolean;
	whitelistEmails: string;
	whitelistNpubs: string;
	whitelistSubscriptionProductIds: string[];
	whitelistAllowEmployees: boolean;
	whitelistAllowPosOverride: boolean;
}): ProductWhitelist | undefined {
	if (!fields.hasWhitelist) {
		return undefined;
	}

	return {
		emails: splitLines(fields.whitelistEmails),
		npubs: splitLines(fields.whitelistNpubs),
		subscriptionProductIds: fields.whitelistSubscriptionProductIds.filter(Boolean),
		allowEmployees: fields.whitelistAllowEmployees,
		allowPosOverride: fields.whitelistAllowPosOverride
	};
}

/**
 * True when the user is an employee, whatever their role. Plain customers and anonymous
 * visitors are not: they never carry a role id.
 */
function isEmployee(user: UserIdentifier): boolean {
	return !!user.userRoleId && user.userRoleId !== CUSTOMER_ROLE_ID;
}

/**
 * Whether a whitelist lets a user through. Pure on purpose: the caller passes the subscription
 * products the user currently holds, so pages that already loaded them do not query twice.
 *
 * The sources are a union — matching a single one is enough.
 */
export function matchesWhitelist(
	whitelist: ProductWhitelist,
	user: UserIdentifier,
	activeSubscriptionProductIds: string[]
): boolean {
	if (whitelist.allowEmployees && isEmployee(user)) {
		return true;
	}

	const listed = new Set(
		[...whitelist.emails, ...whitelist.npubs].map(normalizeAddress).filter(Boolean)
	);
	if (
		listed.size &&
		collectUserAddresses(user)
			.map(normalizeAddress)
			.some((a) => listed.has(a))
	) {
		return true;
	}

	return whitelist.subscriptionProductIds.some((productId) =>
		activeSubscriptionProductIds.includes(productId)
	);
}

/**
 * Subscription products the user holds an active — that is, still paid for — subscription to.
 */
export async function activeSubscriptionProductIds(user: UserIdentifier): Promise<string[]> {
	const subscriptions = await collections.paidSubscriptions
		.find({ ...userQuery(user), paidUntil: { $gt: new Date() } })
		.project<{ productId: string }>({ productId: 1, _id: 0 })
		.toArray();

	return subscriptions.map((subscription) => subscription.productId);
}

/**
 * Whether the user may order the product. Products without a whitelist are open to everyone,
 * which is the case of every product predating the feature.
 *
 * `activeSubscriptions` lets a caller that already loaded them skip the extra query; the
 * subscription collection is only hit when a whitelist actually targets subscribers and no
 * cheaper source matched first.
 */
export async function isProductAllowedForUser(
	product: Pick<Product, 'whitelist'>,
	user: UserIdentifier,
	options?: { activeSubscriptionProductIds?: string[] }
): Promise<boolean> {
	const whitelist = product.whitelist;
	if (!whitelist) {
		return true;
	}

	if (matchesWhitelist(whitelist, user, options?.activeSubscriptionProductIds ?? [])) {
		return true;
	}

	if (options?.activeSubscriptionProductIds || !whitelist.subscriptionProductIds.length) {
		return false;
	}

	return matchesWhitelist(whitelist, user, await activeSubscriptionProductIds(user));
}

/**
 * Flags each product the user may not order, for listings that show many of them at once —
 * CMS product widgets, tag widgets, search lists. The subscription collection is queried once
 * for the whole page, and not at all when no product on it is whitelisted.
 */
export async function annotateProductsWithWhitelist<T extends Pick<Product, 'whitelist'>>(
	products: T[],
	user: UserIdentifier
): Promise<Array<T & { restricted: boolean }>> {
	const whitelisted = products.filter((product) => product.whitelist);
	if (!whitelisted.length) {
		return products.map((product) => ({ ...product, restricted: false }));
	}

	const needsSubscriptions = whitelisted.some(
		(product) => product.whitelist?.subscriptionProductIds.length
	);
	const subscriptionProductIds = needsSubscriptions ? await activeSubscriptionProductIds(user) : [];

	return products.map((product) => ({
		...product,
		restricted: product.whitelist
			? !matchesWhitelist(product.whitelist, user, subscriptionProductIds)
			: false
	}));
}
