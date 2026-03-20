export const SUBSCRIPTION_DURATIONS = ['year', 'month', 'week', 'day', 'hour'] as const;
export type SubscriptionDuration = (typeof SUBSCRIPTION_DURATIONS)[number];
