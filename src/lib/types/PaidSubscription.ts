/**
 * For paid subscriptions
 */

import type { ObjectId } from 'mongodb';
import type { Currency } from './Currency';
import type { SubscriptionDuration } from './SubscriptionDuration';
import type { Timestamps } from './Timestamps';
import type { UserIdentifier } from './UserIdentifier';

export interface PaidSubscription extends Timestamps {
	_id: string;

	number: number;

	user: UserIdentifier;

	productId: string;

	paidUntil: Date;

	notifications: Array<{
		type: 'reminder' | 'expiration';
		createdAt: Date;
		/** 'none' is in the case where the notification medium is not supported */
		medium: 'nostr' | 'email' | 'none';
		_id: ObjectId;
	}>;

	notificationHistory?: Array<{
		type: 'reminder' | 'expiration';
		createdAt: Date;
		medium: 'nostr' | 'email' | 'none';
		_id: ObjectId;
		forPaidUntil: Date;
	}>;

	cancelledAt?: Date;
	freeProductsById?: Record<string, { available: number; total: number; used: number }>;

	/**
	 * Snapshot of the product's `pricingSchedule` at subscription creation time. Locks the tariff
	 * for the buyer even if the product's schedule or base price changes afterwards.
	 */
	pricingScheduleSnapshot?: {
		currency: Currency;
		phases: Array<{
			value: number;
			unit: SubscriptionDuration;
			priceAmount: number;
			reminderValue: number;
			reminderUnit: SubscriptionDuration;
			/**
			 * Absence = still due (pending). Set to `paid` when the order that funded the phase
			 * settles; kept together with `orderId` so the customer can trace each billing back
			 * to the order that paid it (and, later on, so the reminder cron can distinguish a
			 * legitimately-past-schedule sub from one whose renewal simply hasn't happened yet).
			 */
			status?: 'paid';
			orderId?: string;
		}>;
	};

	/**
	 * Index of the next phase to bill. After the initial purchase (phase 0 paid), this is `1`.
	 * When it reaches `phases.length`, the schedule is exhausted and renewals fall back to the
	 * product's current live price on its normal cycle.
	 */
	pricingScheduleCursor?: number;
}
