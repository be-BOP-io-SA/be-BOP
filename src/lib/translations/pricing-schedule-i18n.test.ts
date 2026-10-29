import { describe, expect, it } from 'vitest';
import { languages, locales } from './index';
import { get } from '../utils/get';

const UNITS = ['hour', 'day', 'week', 'month', 'year'] as const;

describe('subscription pricing schedule translations (#2670)', () => {
	it.each(locales)('%s has product.pricingSchedule.intro/then', (locale) => {
		const dict = languages[locale];
		expect(get(dict, 'product.pricingSchedule.intro')).toBeTruthy();
		expect(get(dict, 'product.pricingSchedule.then')).toBeTruthy();
	});

	it.each(locales)('%s has one/other forms for every product.pricingScheduleUnit', (locale) => {
		const dict = languages[locale];
		for (const unit of UNITS) {
			const entry = get(dict, `product.pricingScheduleUnit.${unit}`) as unknown as
				| { one?: string; other?: string }
				| undefined;
			expect(entry?.one, `${locale}: pricingScheduleUnit.${unit}.one`).toBeTruthy();
			expect(entry?.other, `${locale}: pricingScheduleUnit.${unit}.other`).toBeTruthy();
		}
	});
});

const SUBSCRIPTION_KEYS = [
	'subscription.nextBilling',
	'subscription.canRenewFrom',
	'subscription.amountFree',
	'subscription.upcomingPhases.title',
	'subscription.upcomingPhases.range',
	'subscription.upcomingPhases.after',
	'subscription.orderHistory.title',
	'subscription.orderHistory.downloadInvoice',
	'subscription.payment.currentMethod',
	'subscription.payment.previousUnavailable',
	'subscription.payment.chooseMethod',
	'subscription.payment.change'
];

describe('subscription upcoming-phases / payment translations (#2670)', () => {
	it.each(locales)('%s has every subscription key', (locale) => {
		const dict = languages[locale];
		for (const key of SUBSCRIPTION_KEYS) {
			expect(get(dict, key), `${locale}: ${key}`).toBeTruthy();
		}
	});
});

describe('multi-day booking range translations (#2670)', () => {
	it.each(locales)('%s has product.booking.selectedRange/maxRangeExceeded', (locale) => {
		const dict = languages[locale];
		expect(
			get(dict, 'product.booking.selectedRange'),
			`${locale}: booking.selectedRange`
		).toBeTruthy();
		expect(
			get(dict, 'product.booking.maxRangeExceeded'),
			`${locale}: booking.maxRangeExceeded`
		).toBeTruthy();
	});
});
