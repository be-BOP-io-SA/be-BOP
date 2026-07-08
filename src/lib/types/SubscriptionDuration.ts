export const SUBSCRIPTION_DURATIONS = ['year', 'month', 'week', 'day', 'hour'] as const;
export type SubscriptionDuration = (typeof SUBSCRIPTION_DURATIONS)[number];

/**
 * Client- and server-safe converter from a `value + unit` couple (used in phase durations
 * and reminder offsets) to a plain number of seconds. Kept next to the type so admin form
 * bounds and server-side schema validation compute the same cap without duplicating the
 * mapping.
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
