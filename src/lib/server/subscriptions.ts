import type { PaidSubscription } from '$lib/types/PaidSubscription';
import type { UserIdentifier } from '$lib/types/UserIdentifier';
import type { SubscriptionDuration } from '$lib/types/SubscriptionDuration';
import { collections } from './database';
import { runtimeConfig } from './runtime-config';
import { userQuery } from './user';

/** Shared resolver so order renewal and customer display never compute the fallback differently. */
export function resolveSubscriptionDuration(product: {
	subscriptionDuration?: SubscriptionDuration | '';
}): SubscriptionDuration {
	// `||` not `??`: an empty-string snapshot (legacy data, or in-flight UI state)
	// must also fall through to the global, otherwise durations[''] is undefined
	// and add(date, undefined) breaks renewal.
	return (product.subscriptionDuration ||
		runtimeConfig.subscriptionDuration) as SubscriptionDuration;
}

/** Shared resolver so renewal eligibility, /subscription canRenew and the
 * reminder cron all read the same value for a given product. */
export function resolveSubscriptionReminderSeconds(product: {
	subscriptionReminderSeconds?: number;
}): number {
	return product.subscriptionReminderSeconds || runtimeConfig.subscriptionReminderSeconds;
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
