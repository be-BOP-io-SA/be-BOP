import type { PaidSubscription } from '$lib/types/PaidSubscription';
import type { Product } from '$lib/types/Product';
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

/**
 * Builds the snapshot stored on `PaidSubscription` at first payment for a product with a
 * schedule. Each configured phase `{ value: N, unit, priceAmount, … }` is expanded into N
 * unit cycles `{ value: 1, unit, priceAmount, … }`, so the runtime bills one cycle per
 * renewal (e.g. a "3 months at 21 CHF" phase becomes 3 monthly billings of 21 CHF).
 * The cursor on the subscription therefore always points at a single billing cycle.
 */
export function buildPricingScheduleSnapshot(
	product: Pick<Product, 'pricingSchedule' | 'price'>
): PaidSubscription['pricingScheduleSnapshot'] {
	if (!product.pricingSchedule?.length) {
		return undefined;
	}
	return {
		currency: product.price.currency,
		phases: product.pricingSchedule.flatMap((p) =>
			Array.from({ length: p.value }, () => ({
				value: 1,
				unit: p.unit,
				priceAmount: p.priceAmount,
				reminderValue: p.reminderValue,
				reminderUnit: p.reminderUnit
			}))
		)
	};
}

/**
 * Converts a `value + unit` couple (from a phase or reminder) into a plain number of
 * seconds. Used both to extend `paidUntil` at renewal and to compute reminder offsets.
 */
export function subscriptionUnitToSeconds(value: number, unit: SubscriptionDuration): number {
	switch (unit) {
		case 'year':
			return value * 365 * 24 * 60 * 60;
		case 'month':
			return value * 30 * 24 * 60 * 60;
		case 'week':
			return value * 7 * 24 * 60 * 60;
		case 'day':
			return value * 24 * 60 * 60;
		case 'hour':
			return value * 60 * 60;
	}
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
