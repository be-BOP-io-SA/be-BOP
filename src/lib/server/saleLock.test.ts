import { describe, it, expect } from 'vitest';
import { addSeconds, subSeconds } from 'date-fns';
import { CUSTOMER_ROLE_ID } from '$lib/types/User';
import {
	MAX_QUANTITY_PER_USER_FOR_SUBSCRIPTION,
	maxQuantityPerUser,
	requiresAuthenticationToOrder
} from '$lib/types/Product';
import {
	buildProductWhitelist,
	hasSaleLocks,
	isEmployee,
	matchesWhitelist,
	subscriptionOccupiesSlot
} from './saleLock';

const ONE_DAY = 24 * 3600;
const NOW = new Date('2026-09-07T12:00:00Z');

const WHITELIST = {
	emails: ['Alice@Example.com'],
	npubs: ['npub1alice'],
	subscriptionProductIds: ['gold'],
	allowEmployees: false,
	allowPosOverride: false
};

describe('isEmployee', () => {
	it('is false for an anonymous visitor and for a customer role', () => {
		expect(isEmployee(undefined)).toBe(false);
		expect(isEmployee({ sessionId: 'anon' })).toBe(false);
		expect(isEmployee({ sessionId: 'anon', userRoleId: CUSTOMER_ROLE_ID })).toBe(false);
	});

	it('is true for any other role', () => {
		expect(isEmployee({ sessionId: 'anon', userRoleId: 'employee' })).toBe(true);
	});
});

describe('matchesWhitelist', () => {
	it('matches a listed e-mail whatever its case', () => {
		expect(matchesWhitelist(WHITELIST, { email: 'alice@example.com' }, [])).toBe(true);
	});

	it('matches a listed npub', () => {
		expect(matchesWhitelist(WHITELIST, { npub: 'npub1alice' }, [])).toBe(true);
	});

	it('matches an active subscriber without listing them by hand', () => {
		expect(matchesWhitelist(WHITELIST, { sessionId: 'anon' }, ['gold'])).toBe(true);
	});

	it('turns nobody away who matches none of the sources', () => {
		expect(matchesWhitelist(WHITELIST, { email: 'bob@example.com' }, ['silver'])).toBe(false);
	});

	it('lets employees in only when the option says so', () => {
		const employee = { sessionId: 'anon', userRoleId: 'employee' };
		expect(matchesWhitelist(WHITELIST, employee, [])).toBe(false);
		expect(matchesWhitelist({ ...WHITELIST, allowEmployees: true }, employee, [])).toBe(true);
	});

	it('closes the product when every source is empty — an empty guest list', () => {
		const empty = {
			emails: [],
			npubs: [],
			subscriptionProductIds: [],
			allowEmployees: false,
			allowPosOverride: false
		};
		expect(matchesWhitelist(empty, { email: 'alice@example.com' }, ['gold'])).toBe(false);
	});
});

describe('buildProductWhitelist', () => {
	const fields = {
		hasWhitelist: true,
		whitelistEmails: ' alice@example.com \n\n bob@example.com ',
		whitelistNpubs: '',
		whitelistSubscriptionProductIds: ['gold', ''],
		whitelistAllowEmployees: true,
		whitelistAllowPosOverride: false
	};

	it('is undefined when the option is off, leaving the product open', () => {
		expect(buildProductWhitelist({ ...fields, hasWhitelist: false })).toBeUndefined();
	});

	it('trims the text areas and drops blank lines', () => {
		expect(buildProductWhitelist(fields)).toEqual({
			emails: ['alice@example.com', 'bob@example.com'],
			npubs: [],
			subscriptionProductIds: ['gold'],
			allowEmployees: true,
			allowPosOverride: false
		});
	});
});

describe('maxQuantityPerUser', () => {
	it('is undefined on an uncapped product', () => {
		expect(maxQuantityPerUser({ type: 'resource' })).toBeUndefined();
	});

	it('is the stored value on a regular product', () => {
		expect(maxQuantityPerUser({ type: 'resource', maxQuantityPerUser: 3 })).toBe(3);
	});

	it('is one on a subscription, whatever the document says', () => {
		expect(maxQuantityPerUser({ type: 'subscription', maxQuantityPerUser: 5 })).toBe(
			MAX_QUANTITY_PER_USER_FOR_SUBSCRIPTION
		);
	});
});

describe('requiresAuthenticationToOrder', () => {
	it('follows the option on its own', () => {
		expect(requiresAuthenticationToOrder({})).toBe(false);
		expect(requiresAuthenticationToOrder({ requiresAuthentication: true })).toBe(true);
	});

	it('is turned on by a per-person cap, which is meaningless without an identity', () => {
		expect(requiresAuthenticationToOrder({ maxQuantityPerUser: 2 })).toBe(true);
	});

	it('is not turned on by the implicit one-per-person rule of subscriptions', () => {
		// The rule reads the stored field, which a subscription leaves unset.
		expect(requiresAuthenticationToOrder({})).toBe(false);
	});
});

describe('subscriptionOccupiesSlot', () => {
	const product = { subscriptionReminderSeconds: ONE_DAY };

	it('holds the slot while the subscription runs and renewal is not open yet', () => {
		expect(
			subscriptionOccupiesSlot({ paidUntil: addSeconds(NOW, 30 * ONE_DAY) }, product, NOW)
		).toBe(true);
	});

	it('frees the slot once inside the renewal window, so renewals go through', () => {
		expect(
			subscriptionOccupiesSlot({ paidUntil: addSeconds(NOW, ONE_DAY / 2) }, product, NOW)
		).toBe(false);
	});

	it('frees the slot on an expired subscription', () => {
		expect(subscriptionOccupiesSlot({ paidUntil: subSeconds(NOW, ONE_DAY) }, product, NOW)).toBe(
			false
		);
	});
});

describe('hasSaleLocks', () => {
	it('is false on a plain product, which is what lets listings skip every query', () => {
		expect(hasSaleLocks({ _id: 'p', name: 'P', type: 'resource' })).toBe(false);
	});

	it('is true for each of the three locks', () => {
		expect(
			hasSaleLocks({ _id: 'p', name: 'P', type: 'resource', requiresAuthentication: true })
		).toBe(true);
		expect(hasSaleLocks({ _id: 'p', name: 'P', type: 'resource', whitelist: WHITELIST })).toBe(
			true
		);
		expect(hasSaleLocks({ _id: 'p', name: 'P', type: 'resource', maxQuantityPerUser: 2 })).toBe(
			true
		);
	});

	it('is true on every subscription — one per person predates the property', () => {
		expect(hasSaleLocks({ _id: 'p', name: 'P', type: 'subscription' })).toBe(true);
	});
});
