import { describe, it, expect } from 'vitest';
import { addSeconds, subSeconds } from 'date-fns';
import { maxQuantityPerUser, MAX_QUANTITY_PER_USER_FOR_SUBSCRIPTION } from '$lib/types/Product';
import { subscriptionOccupiesSlot } from './maxQuantityPerUser';

const NOW = new Date('2026-09-07T12:00:00Z');
const ONE_DAY = 24 * 3600;

describe('maxQuantityPerUser', () => {
	it('is undefined when the product carries no cap', () => {
		expect(maxQuantityPerUser({ type: 'resource' })).toBeUndefined();
	});

	it('is the stored value on a regular product', () => {
		expect(maxQuantityPerUser({ type: 'resource', maxQuantityPerUser: 3 })).toBe(3);
	});

	it('is one on a subscription, whatever the document says', () => {
		expect(maxQuantityPerUser({ type: 'subscription', maxQuantityPerUser: 5 })).toBe(
			MAX_QUANTITY_PER_USER_FOR_SUBSCRIPTION
		);
		expect(maxQuantityPerUser({ type: 'subscription' })).toBe(1);
	});
});

describe('subscriptionOccupiesSlot', () => {
	const product = { subscriptionReminderSeconds: ONE_DAY };

	it('holds the slot while the subscription runs and renewal is not open yet', () => {
		expect(
			subscriptionOccupiesSlot({ paidUntil: addSeconds(NOW, 30 * ONE_DAY) }, product, NOW)
		).toBe(true);
	});

	it('frees the slot once inside the renewal window', () => {
		// paidUntil is in the future, but less than the reminder offset away: the customer is
		// allowed to renew, so the product must reopen for them.
		expect(
			subscriptionOccupiesSlot({ paidUntil: addSeconds(NOW, ONE_DAY / 2) }, product, NOW)
		).toBe(false);
	});

	it('frees the slot on an expired subscription', () => {
		expect(subscriptionOccupiesSlot({ paidUntil: subSeconds(NOW, ONE_DAY) }, product, NOW)).toBe(
			false
		);
	});

	it('uses the phase reminder from the snapshot rather than the product offset', () => {
		// Phase 1 funded the current period (cursor points at the next one to bill) and its
		// reminder is 10 days, far wider than the product's single day.
		const subscription = {
			paidUntil: addSeconds(NOW, 5 * ONE_DAY),
			pricingScheduleCursor: 2,
			pricingScheduleSnapshot: {
				currency: 'EUR' as const,
				phases: [
					{
						value: 1,
						unit: 'month' as const,
						priceAmount: 10,
						reminderValue: 10,
						reminderUnit: 'day' as const
					},
					{
						value: 1,
						unit: 'month' as const,
						priceAmount: 20,
						reminderValue: 10,
						reminderUnit: 'day' as const
					}
				]
			}
		};

		expect(subscriptionOccupiesSlot(subscription, product, NOW)).toBe(false);
	});
});
