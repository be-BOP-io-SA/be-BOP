import type { PaidSubscription } from '$lib/types/PaidSubscription';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import type { SubscriptionDuration } from '$lib/types/SubscriptionDuration';
import type { WithId } from 'mongodb';
import { collections } from './database';
import { runtimeConfig } from './runtime-config';
import { userQuery } from './user';

export function resolveSubscriptionDuration(product: {
	subscriptionDuration?: SubscriptionDuration;
}): SubscriptionDuration {
	return (product.subscriptionDuration ??
		runtimeConfig.subscriptionDuration) as SubscriptionDuration;
}

export function userSubscriptionForProduct(
	user: UserIdentifier,
	productId: string
): Promise<WithId<PaidSubscription> | null> {
	return collections.paidSubscriptions.findOne({ ...userQuery(user), productId });
}

export async function isEligibleForFreeTrial(
	user: UserIdentifier,
	product: { _id: string; freeTrialDays?: number }
): Promise<boolean> {
	if (!((product.freeTrialDays ?? 0) > 0)) {
		return false;
	}
	if (!user.email && !user.npub) {
		return false;
	}
	return !(await userSubscriptionForProduct(user, product._id));
}

export async function freeProductsForUser(
	user: UserIdentifier,
	products: string[]
): Promise<Record<string, number>> {
	if (products.length === 0) {
		return {};
	}
	const existingSubscriptions = await collections.paidSubscriptions
		.find({
			...userQuery(user),
			$or: products.map((productId) => ({
				[`freeProductsById.${productId}.available`]: { $gt: 0 }
			})),
			paidUntil: { $gt: new Date() }
		})
		.sort({ createdAt: 1 })
		.project<Pick<PaidSubscription, '_id' | 'freeProductsById'>>({ _id: 1, freeProductsById: 1 })
		.toArray();
	return existingSubscriptions.reduce((acc: Record<string, number>, subscription) => {
		for (const [productId, { available }] of Object.entries(subscription.freeProductsById ?? {})) {
			acc[productId] = (acc[productId] ?? 0) + available;
		}
		return acc;
	}, {});
}

export async function generateSubscriptionNumber(): Promise<number> {
	const res = await collections.runtimeConfig.findOneAndUpdate(
		{ _id: 'subscriptionNumber' },
		{ $inc: { data: 1 as never } },
		{ upsert: true, returnDocument: 'after' }
	);

	if (!res.value) {
		throw new Error('Failed to increment subscription number');
	}

	return res.value.data as number;
}
