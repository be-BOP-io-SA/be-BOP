import { PaidSubscription } from '$lib/types/PaidSubscription';
import { UserIdentifier } from '$lib/types/UserIdentifier';
import { collections } from './database';
import { userQuery } from './user';

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
