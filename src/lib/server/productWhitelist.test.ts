import { describe, expect, it } from 'vitest';
import { buildProductWhitelist, matchesWhitelist, type ProductWhitelist } from './productWhitelist';
import { CUSTOMER_ROLE_ID, POS_ROLE_ID } from '$lib/types/User';
import type { UserIdentifier } from '$lib/types/UserIdentifier';

const emptyWhitelist: ProductWhitelist = {
	emails: [],
	npubs: [],
	subscriptionProductIds: [],
	allowEmployees: false,
	allowPosOverride: false
};

describe('matchesWhitelist', () => {
	it('lets a listed e-mail address through', () => {
		const whitelist = { ...emptyWhitelist, emails: ['member@example.com'] };
		const user: UserIdentifier = { email: 'member@example.com' };

		expect(matchesWhitelist(whitelist, user, [])).toBe(true);
	});

	it('ignores case and surrounding spaces on e-mail addresses', () => {
		const whitelist = { ...emptyWhitelist, emails: ['  Member@Example.com '] };
		const user: UserIdentifier = { email: 'member@example.com' };

		expect(matchesWhitelist(whitelist, user, [])).toBe(true);
	});

	it('matches on a secondary e-mail address too', () => {
		const whitelist = { ...emptyWhitelist, emails: ['second@example.com'] };
		const user: UserIdentifier = {
			email: 'first@example.com',
			secondaryEmails: ['second@example.com']
		};

		expect(matchesWhitelist(whitelist, user, [])).toBe(true);
	});

	it('lets a listed npub through', () => {
		const whitelist = { ...emptyWhitelist, npubs: ['npub1abc'] };

		expect(matchesWhitelist(whitelist, { npub: 'npub1abc' }, [])).toBe(true);
	});

	it('keeps out a visitor who matches nothing', () => {
		const whitelist = { ...emptyWhitelist, emails: ['member@example.com'], npubs: ['npub1abc'] };
		const user: UserIdentifier = { email: 'someone-else@example.com', npub: 'npub1zzz' };

		expect(matchesWhitelist(whitelist, user, [])).toBe(false);
	});

	it('lets an active subscriber of a listed subscription through', () => {
		const whitelist = { ...emptyWhitelist, subscriptionProductIds: ['gold-membership'] };

		expect(matchesWhitelist(whitelist, {}, ['gold-membership'])).toBe(true);
	});

	it('keeps out a subscriber of another subscription', () => {
		const whitelist = { ...emptyWhitelist, subscriptionProductIds: ['gold-membership'] };

		expect(matchesWhitelist(whitelist, {}, ['silver-membership'])).toBe(false);
	});

	it('lets an employee through when the option is on', () => {
		const whitelist = { ...emptyWhitelist, allowEmployees: true };

		expect(matchesWhitelist(whitelist, { userRoleId: POS_ROLE_ID }, [])).toBe(true);
	});

	it('does not treat a plain customer account as an employee', () => {
		const whitelist = { ...emptyWhitelist, allowEmployees: true };

		expect(matchesWhitelist(whitelist, { userRoleId: CUSTOMER_ROLE_ID }, [])).toBe(false);
	});

	it('keeps an employee out when the option is off', () => {
		expect(matchesWhitelist(emptyWhitelist, { userRoleId: POS_ROLE_ID }, [])).toBe(false);
	});

	it('lets nobody through when every source is empty', () => {
		expect(matchesWhitelist(emptyWhitelist, { email: 'member@example.com' }, ['gold'])).toBe(false);
	});
});

describe('buildProductWhitelist', () => {
	const fields = {
		hasWhitelist: true,
		whitelistEmails: 'first@example.com\n  second@example.com  \n\n',
		whitelistNpubs: 'npub1abc\n',
		whitelistSubscriptionProductIds: ['gold-membership', ''],
		whitelistAllowEmployees: true,
		whitelistAllowPosOverride: false
	};

	it('splits the text areas on lines and drops the blanks', () => {
		expect(buildProductWhitelist(fields)).toEqual({
			emails: ['first@example.com', 'second@example.com'],
			npubs: ['npub1abc'],
			subscriptionProductIds: ['gold-membership'],
			allowEmployees: true,
			allowPosOverride: false
		});
	});

	it('leaves the product open when the box is unticked', () => {
		expect(buildProductWhitelist({ ...fields, hasWhitelist: false })).toBeUndefined();
	});
});
