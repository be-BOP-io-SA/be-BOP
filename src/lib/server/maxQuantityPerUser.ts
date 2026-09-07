import { subSeconds } from 'date-fns';
import type { ClientSession } from 'mongodb';
import type { Product } from '$lib/types/Product';
import type { PaidSubscription } from '$lib/types/PaidSubscription';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import { collections } from './database';
import { userQuery } from './user';
import { currentFundingReminderSeconds } from './subscriptions';
import { MAX_QUANTITY_PER_USER_FOR_SUBSCRIPTION, maxQuantityPerUser } from '$lib/types/Product';

export type ProductForUserLimit = Pick<
	Product,
	'_id' | 'type' | 'maxQuantityPerUser' | 'subscriptionReminderSeconds'
>;

/**
 * Whether a subscription still occupies its holder's single slot.
 *
 * A renewal is an order like any other, so counting orders would close a subscription
 * forever the day it is first renewed. The criterion is the one `createOrder` already
 * applies: held, and not yet inside its renewal window.
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

/**
 * Units of this product the person already holds or is in the middle of paying for.
 *
 * Orders awaiting payment count: without them a customer opens two orders side by side,
 * pays both, and lands over the cap.
 */
export async function quantityAlreadyTakenByUser(
	product: ProductForUserLimit,
	user: UserIdentifier,
	opts?: { session?: ClientSession }
): Promise<number> {
	if (product.type === 'subscription') {
		const existing = await collections.paidSubscriptions.findOne(
			{ ...userQuery(user), productId: product._id },
			{ session: opts?.session }
		);

		if (existing && subscriptionOccupiesSlot(existing, product)) {
			return MAX_QUANTITY_PER_USER_FOR_SUBSCRIPTION;
		}

		const pending = await collections.orders.countDocuments(
			{
				...userQuery(user),
				'items.product._id': product._id,
				status: 'pending'
			},
			{ limit: 1, session: opts?.session }
		);

		return pending ? MAX_QUANTITY_PER_USER_FOR_SUBSCRIPTION : 0;
	}

	const [aggregated] = await collections.orders
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
			{ session: opts?.session }
		)
		.toArray();

	return aggregated?.total ?? 0;
}

/**
 * Cap and consumption in one call, for the callers that need to tell the customer where
 * they stand before they click — the product page CTA, mainly. `remaining` is `undefined`
 * on an uncapped product.
 */
export async function maxQuantityPerUserStatus(
	product: ProductForUserLimit,
	user: UserIdentifier,
	opts?: { session?: ClientSession }
): Promise<{ max: number; alreadyTaken: number; remaining: number } | undefined> {
	const max = maxQuantityPerUser(product);

	if (max === undefined) {
		return undefined;
	}

	const alreadyTaken = await quantityAlreadyTakenByUser(product, user, opts);

	return { max, alreadyTaken, remaining: Math.max(max - alreadyTaken, 0) };
}
