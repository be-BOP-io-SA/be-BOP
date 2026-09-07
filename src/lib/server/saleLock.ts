import { subSeconds } from 'date-fns';
import type { ClientSession } from 'mongodb';
import type { PaidSubscription } from '$lib/types/PaidSubscription';
import type { Product } from '$lib/types/Product';
import {
	DEFAULT_MAX_QUANTITY_PER_ORDER,
	MAX_QUANTITY_PER_USER_FOR_SUBSCRIPTION,
	maxQuantityPerUser,
	requiresAuthenticationToOrder
} from '$lib/types/Product';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import { collections } from './database';
import { collectUserAddresses, isAuthenticated } from './discount';
import { currentFundingReminderSeconds } from './subscriptions';
import { userQuery } from './user';

/**
 * A sale lock is a per-product rule that answers one question: may *this* customer buy *this*
 * product right now? Three rules share the mechanism — they differ only in what they check and
 * in what the customer is told.
 *
 * Every rule is enforced in the same three places, and nowhere else:
 *   - `addToCartInDb`, so the product never enters the cart;
 *   - `checkCartItems`, which the cart page, the checkout page and order creation all call;
 *   - the front, which asks for the same verdict to grey a CTA out before it is clicked.
 *
 * Adding a fourth rule means adding a case below and a translation. It must not mean touching
 * the cart, the checkout or the order again.
 */
export const SALE_LOCK_CODES = [
	'LOGIN_REQUIRED',
	'NOT_WHITELISTED',
	'MAX_PER_USER',
	'MAX_PER_ORDER',
	'OUT_OF_STOCK'
] as const;
export type SaleLockCode = (typeof SALE_LOCK_CODES)[number];

export type SaleLock = {
	code: SaleLockCode;
	/** Interpolated into `saleLock.<code>` on the front. */
	params?: Record<string, string | number>;
};

/**
 * Whether a thrown error is a sale lock. Every route that can put a product in a cart uses
 * this to send the customer to a page that explains the refusal, instead of letting a 400
 * error page do it in English.
 */
export function isSaleLockError(err: unknown): boolean {
	const code =
		typeof err === 'object' && err && 'body' in err
			? (err as { body?: { code?: string } }).body?.code
			: undefined;
	return !!code && (SALE_LOCK_CODES as readonly string[]).includes(code);
}

/**
 * Fallback wording, for the callers that have no translation at hand — NostR, a raw API
 * client. Every surface a customer actually reads goes through `saleLock.<code>` instead.
 */
export function saleLockMessage(locks: SaleLock[], productName: string): string {
	return locks.map((lock) => saleLockReason(lock, productName)).join(' ');
}

function saleLockReason(lock: SaleLock, productName: string): string {
	switch (lock.code) {
		case 'LOGIN_REQUIRED':
			return `You need to be logged in to order: ${productName}`;
		case 'NOT_WHITELISTED':
			return `This product is reserved for selected customers: ${productName}`;
		case 'MAX_PER_USER':
			return `You have reached the maximum you can order for: ${productName}`;
		case 'MAX_PER_ORDER':
			return `You can only order ${lock.params?.max} of this product: ${productName}`;
		case 'OUT_OF_STOCK':
			return `Out of stock: ${productName}`;
		default:
			lock.code satisfies never;
			return productName;
	}
}

/**
 * Turns the admin form fields into the stored whitelist, or undefined when the product is
 * left open to everyone. The two text areas hold one address per line.
 */
export function buildProductWhitelist(fields: {
	hasWhitelist: boolean;
	whitelistEmails: string;
	whitelistNpubs: string;
	whitelistSubscriptionProductIds: string[];
	whitelistAllowEmployees: boolean;
	whitelistAllowPosOverride: boolean;
}): Product['whitelist'] {
	if (!fields.hasWhitelist) {
		return undefined;
	}

	const splitLines = (value: string) =>
		value
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean);

	return {
		emails: splitLines(fields.whitelistEmails),
		npubs: splitLines(fields.whitelistNpubs),
		subscriptionProductIds: fields.whitelistSubscriptionProductIds.filter(Boolean),
		allowEmployees: fields.whitelistAllowEmployees,
		allowPosOverride: fields.whitelistAllowPosOverride
	};
}

export type ProductWithSaleLocks = Pick<
	Product,
	| '_id'
	| 'name'
	| 'type'
	| 'requiresAuthentication'
	| 'whitelist'
	| 'maxQuantityPerUser'
	| 'subscriptionReminderSeconds'
	| 'maxQuantityPerOrder'
	| 'stock'
	| 'stockReference'
>;

export type SaleLockContext = {
	/** How the product is being added. The counter gets exemptions a customer does not. */
	mode?: 'eshop' | 'nostr' | 'pos';
	/** Units of each product about to be added, on top of what the cart already holds. */
	extraQuantityByProductId?: Record<string, number>;
	/** Units of each product the cart already holds. Counts against the per-order cap. */
	quantityInCartByProductId?: Record<string, number>;
	/**
	 * Units of each product still sellable, this visitor's own reservations excluded — see
	 * `resolveAvailableAmounts`. Absent means the caller has nothing to say about stock.
	 */
	availableByProductId?: Record<string, number>;
	session?: ClientSession;
};

/**
 * An employee, whatever their role. At the counter the session belongs to the seller and not
 * to the buyer, so rules that describe *the buyer* cannot be read from it.
 */
export function isEmployee(user: UserIdentifier | undefined): boolean {
	return !!user?.userRoleId && user.userRoleId !== CUSTOMER_ROLE_ID;
}

/**
 * Whether a stored identity is the same *identified* person — account, contact address, npub
 * or SSO. The browser session deliberately does not count: see `identifiedUserQuery`.
 */
function matchesIdentifiedUser(stored: UserIdentifier, user: UserIdentifier | undefined): boolean {
	if (!user) {
		return false;
	}
	const addresses = new Set(collectUserAddresses(user).map(normalizeAddress));
	return !!(
		(user.userId && stored.userId === user.userId) ||
		(stored.email && addresses.has(normalizeAddress(stored.email))) ||
		(stored.npub && addresses.has(normalizeAddress(stored.npub))) ||
		stored.ssoIds?.some((ssoId) => user.ssoIds?.includes(ssoId))
	);
}

function normalizeAddress(address: string): string {
	return address.trim().toLowerCase();
}

/**
 * Whether a whitelist lets a user through. Pure: the caller passes the subscriptions the user
 * holds, so a page that already loaded them does not query twice.
 *
 * The sources are a union — matching a single one is enough. A whitelist that is switched on
 * with every source empty lets nobody through, which is what an empty guest list means.
 */
export function matchesWhitelist(
	whitelist: NonNullable<Product['whitelist']>,
	user: UserIdentifier | undefined,
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
			.some((address) => listed.has(address))
	) {
		return true;
	}

	return whitelist.subscriptionProductIds.some((productId) =>
		activeSubscriptionProductIds.includes(productId)
	);
}

/**
 * Whether a subscription still occupies its holder's single slot.
 *
 * A renewal is an order like any other, so counting orders would close a subscription forever
 * the day it is first renewed. The criterion is the one `createOrder` already applies: held,
 * and not yet inside its renewal window.
 */
export function subscriptionOccupiesSlot(
	subscription: Pick<
		PaidSubscription,
		'paidUntil' | 'pricingScheduleSnapshot' | 'pricingScheduleCursor' | 'cancelledAt'
	>,
	product: { subscriptionReminderSeconds?: number },
	now = new Date()
): boolean {
	return (
		subSeconds(subscription.paidUntil, currentFundingReminderSeconds(subscription, product)) > now
	);
}

/** True when at least one rule could possibly apply — lets callers skip every query. */
export function hasSaleLocks(product: ProductWithSaleLocks): boolean {
	return (
		requiresAuthenticationToOrder(product) ||
		!!product.whitelist ||
		maxQuantityPerUser(product) !== undefined
	);
}

/**
 * The verdict for each product, by product id. A product absent from the map may be bought.
 *
 * Every query is made once for the whole batch, and only when some product needs it: a cart of
 * ordinary products costs nothing.
 */
export async function evaluateSaleLocks(
	products: ProductWithSaleLocks[],
	user: UserIdentifier | undefined,
	context?: SaleLockContext
): Promise<Map<string, SaleLock[]>> {
	const locks = new Map<string, SaleLock[]>();
	// Every product is evaluated: stock and the per-order cap apply to all of them, and it is
	// having them answered elsewhere that made the customer's experience depend on which rule
	// happened to fire first.
	const locked = products;

	if (!locked.length) {
		return locks;
	}

	const session = context?.session;
	const employee = isEmployee(user);

	// The counter sells to a walk-in customer under the seller's own session, so rules that
	// read the buyer's identity would read the seller's and are skipped there. Being an
	// employee is not enough on its own: on the e-shop an employee buys for themselves and is
	// a customer like any other. The whitelist keeps its own per-product answer to this.
	const sellerSession = context?.mode === 'pos';

	const needsSubscriptions = locked.some(
		(product) =>
			product.whitelist?.subscriptionProductIds.length ||
			(product.type === 'subscription' && maxQuantityPerUser(product) !== undefined)
	);
	const subscriptions =
		needsSubscriptions && user
			? await collections.paidSubscriptions
					.find({ ...userQuery(user), paidUntil: { $gt: new Date() } }, { session })
					.toArray()
			: [];

	// Two different questions, two different identities. Whether a subscription already
	// occupies someone's single slot is a refusal, and the browser session counts for it — that
	// is how an anonymous buyer is stopped from taking a second one. Whether a subscription
	// lets someone through a whitelist is a grant, and a session that once served a subscriber
	// must not carry that right to whoever holds the browser next.
	const activeSubscriptionProductIds = subscriptions
		.filter((subscription) => matchesIdentifiedUser(subscription.user, user))
		.map((subscription) => subscription.productId);

	const cappedIds = locked
		.filter(
			(product) => product.type !== 'subscription' && maxQuantityPerUser(product) !== undefined
		)
		.map((product) => product._id);
	const takenByProductId = new Map<string, number>();
	if (cappedIds.length && user && !sellerSession) {
		const rows = await collections.orders
			.aggregate<{ _id: string; total: number }>(
				[
					{
						$match: {
							...userQuery(user),
							'items.product._id': { $in: cappedIds },
							status: { $in: ['pending', 'paid'] }
						}
					},
					{ $unwind: '$items' },
					{ $match: { 'items.product._id': { $in: cappedIds } } },
					{ $group: { _id: '$items.product._id', total: { $sum: '$items.quantity' } } }
				],
				{ session }
			)
			.toArray();
		for (const row of rows) {
			takenByProductId.set(row._id, row.total);
		}
	}

	// Only reached when a subscription product carries a cap, which is always: a subscription is
	// one per person by a rule that predates all of this.
	const subscriptionIds = locked
		.filter((product) => product.type === 'subscription')
		.map((product) => product._id);
	const pendingSubscriptionOrderIds = new Set<string>();
	if (subscriptionIds.length && user && !sellerSession) {
		const rows = await collections.orders
			.aggregate<{ _id: string }>(
				[
					{
						$match: {
							...userQuery(user),
							'items.product._id': { $in: subscriptionIds },
							status: 'pending'
						}
					},
					{ $unwind: '$items' },
					{ $match: { 'items.product._id': { $in: subscriptionIds } } },
					{ $group: { _id: '$items.product._id' } }
				],
				{ session }
			)
			.toArray();
		for (const row of rows) {
			pendingSubscriptionOrderIds.add(row._id);
		}
	}

	for (const product of locked) {
		const productLocks = locksFor(product, user, {
			employee,
			sellerSession,
			mode: context?.mode,
			activeSubscriptionProductIds,
			subscriptions,
			takenByProductId,
			pendingSubscriptionOrderIds,
			extraQuantity: context?.extraQuantityByProductId?.[product._id] ?? 0,
			quantityInCart: context?.quantityInCartByProductId?.[product._id] ?? 0,
			available: context?.availableByProductId?.[product._id]
		});
		if (productLocks.length) {
			locks.set(product._id, productLocks);
		}
	}

	return locks;
}

/**
 * Every reason this customer may not buy this product, not just the first — a product can
 * carry all three locks at once and the customer deserves to know all of them.
 *
 * One exception: while nobody is identified, the other two rules have nothing to read. Telling
 * an anonymous visitor they are "not on the list" would be a guess, and possibly a wrong one —
 * they may well be on it once logged in. So `LOGIN_REQUIRED` stands alone.
 */
function locksFor(
	product: ProductWithSaleLocks,
	user: UserIdentifier | undefined,
	ctx: {
		employee: boolean;
		sellerSession: boolean;
		mode?: 'eshop' | 'nostr' | 'pos';
		activeSubscriptionProductIds: string[];
		subscriptions: PaidSubscription[];
		takenByProductId: Map<string, number>;
		pendingSubscriptionOrderIds: Set<string>;
		extraQuantity: number;
		quantityInCart: number;
		available: number | undefined;
	}
): SaleLock[] {
	if (requiresAuthenticationToOrder(product) && !ctx.employee && !isAuthenticated(user)) {
		return [{ code: 'LOGIN_REQUIRED' }];
	}

	const found: SaleLock[] = [];

	if (product.whitelist) {
		const posOverride = ctx.mode === 'pos' && product.whitelist.allowPosOverride;
		if (
			!posOverride &&
			!matchesWhitelist(product.whitelist, user, ctx.activeSubscriptionProductIds)
		) {
			found.push({ code: 'NOT_WHITELISTED' });
		}
	}

	// What this person is asking for: what already sits in their cart, plus what they are adding.
	const wanted = ctx.quantityInCart + ctx.extraQuantity;

	const max = maxQuantityPerUser(product);
	if (max !== undefined && !ctx.sellerSession) {
		const taken =
			product.type === 'subscription'
				? subscriptionUnitsHeld(product, ctx.subscriptions, ctx.pendingSubscriptionOrderIds)
				: ctx.takenByProductId.get(product._id) ?? 0;

		// The cart counts. Leaving it out let a cart already sitting on the cap look allowed, and
		// the page then blamed the stock for a refusal that had nothing to do with it.
		if (taken + wanted > max) {
			found.push({ code: 'MAX_PER_USER', params: { max } });
		}
	}

	// Rules that predate the sale locks, answered here so there is one list of reasons and one
	// way of being told, whoever the customer is and whichever rule bites first.

	// Nothing left to reserve is its own answer. Wanting more than is left is not: the cap the
	// customer runs into is whichever of stock and per-order limit is lower, and it has always
	// been reported as MAX_PER_ORDER carrying that figure. Kept as it was.
	if (ctx.available !== undefined && ctx.available <= 0) {
		found.push({ code: 'OUT_OF_STOCK' });
		return found;
	}

	const maxPerOrder = Math.min(
		product.maxQuantityPerOrder || DEFAULT_MAX_QUANTITY_PER_ORDER,
		ctx.available ?? Infinity
	);
	if (wanted > maxPerOrder) {
		found.push({ code: 'MAX_PER_ORDER', params: { max: maxPerOrder } });
	}

	return found;
}

function subscriptionUnitsHeld(
	product: ProductWithSaleLocks,
	subscriptions: PaidSubscription[],
	pendingSubscriptionOrderIds: Set<string>
): number {
	const held = subscriptions.find((subscription) => subscription.productId === product._id);
	if (held && subscriptionOccupiesSlot(held, product)) {
		return 1;
	}
	return pendingSubscriptionOrderIds.has(product._id) ? 1 : 0;
}

/**
 * Flags each product a listing must not offer straight to the cart — CMS product widgets, tag
 * widgets, search lists. The queries are made once for the whole page, and not at all when no
 * product on it carries a lock.
 */
export async function annotateProductsWithSaleLocks<T extends ProductWithSaleLocks>(
	products: T[],
	user: UserIdentifier | undefined
): Promise<Array<T & { saleLocked: boolean }>> {
	if (!products.some(hasSaleLocks)) {
		return products.map((product) => ({ ...product, saleLocked: false }));
	}

	const locks = await evaluateSaleLocks(products, user);
	return products.map((product) => ({ ...product, saleLocked: locks.has(product._id) }));
}

/**
 * Units of a product this person may still take, or undefined when it is uncapped.
 *
 * The quantity picker asks for this: offering a number the cart is bound to refuse turns a
 * plain limit into a broken button.
 */
export async function remainingForUser(
	product: ProductWithSaleLocks,
	user: UserIdentifier | undefined,
	session?: ClientSession
): Promise<number | undefined> {
	const max = maxQuantityPerUser(product);
	if (max === undefined || !user) {
		return undefined;
	}

	return Math.max(max - (await quantityTakenByUser(product, user, session)), 0);
}

/**
 * Units of a product this person already holds or is in the middle of paying for.
 *
 * A subscription is not counted in orders: a renewal is an order, and counting those would
 * close it for good at the first one. It is held, or it is not — the same criterion order
 * creation applies.
 */
async function quantityTakenByUser(
	product: ProductWithSaleLocks,
	user: UserIdentifier,
	session?: ClientSession
): Promise<number> {
	if (product.type === 'subscription') {
		const [held, pending] = await Promise.all([
			collections.paidSubscriptions.findOne(
				{ ...userQuery(user), productId: product._id, paidUntil: { $gt: new Date() } },
				{ session }
			),
			collections.orders.countDocuments(
				{ ...userQuery(user), 'items.product._id': product._id, status: 'pending' },
				{ limit: 1, session }
			)
		]);
		if (held && subscriptionOccupiesSlot(held, product)) {
			return MAX_QUANTITY_PER_USER_FOR_SUBSCRIPTION;
		}
		return pending ? MAX_QUANTITY_PER_USER_FOR_SUBSCRIPTION : 0;
	}

	const [row] = await collections.orders
		.aggregate<{ total: number }>(
			[
				{
					$match: {
						...userQuery(user),
						'items.product._id': product._id,
						status: { $in: ['pending', 'paid'] }
					}
				},
				{ $unwind: '$items' },
				{ $match: { 'items.product._id': product._id } },
				{ $group: { _id: null, total: { $sum: '$items.quantity' } } }
			],
			{ session }
		)
		.toArray();

	return row?.total ?? 0;
}
