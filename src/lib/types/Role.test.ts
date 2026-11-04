import { describe, expect, it } from 'vitest';
import { isAllowedOnPage, isRoleWithin, type Role } from './Role';

function role(permissions: Partial<Role['permissions']>, hasPosOptions?: boolean): Role {
	return {
		_id: 'test',
		name: 'test',
		createdAt: new Date(),
		updatedAt: new Date(),
		hasPosOptions,
		permissions: { read: [], write: [], forbidden: [], ...permissions }
	};
}

describe('isRoleWithin', () => {
	it('accepts a role that is the same as the caller', () => {
		const hr = role({ write: ['/admin/arm/*'], read: ['/admin/product/*'] });
		expect(isRoleWithin(hr, hr)).toBe(true);
	});

	it('accepts a narrower role', () => {
		expect(
			isRoleWithin(role({ write: ['/admin/arm/user/*'] }), role({ write: ['/admin/arm/*'] }))
		).toBe(true);
	});

	it('lets write cover read', () => {
		expect(isRoleWithin(role({ read: ['/admin/product/*'] }), role({ write: ['/admin/*'] }))).toBe(
			true
		);
	});

	it('rejects a role with write the caller only reads', () => {
		expect(
			isRoleWithin(role({ write: ['/admin/product/*'] }), role({ read: ['/admin/product/*'] }))
		).toBe(false);
	});

	it('rejects a wider role', () => {
		expect(isRoleWithin(role({ write: ['/admin/*'] }), role({ write: ['/admin/arm/*'] }))).toBe(
			false
		);
	});

	it('rejects a role that reopens a page the caller is forbidden from', () => {
		expect(
			isRoleWithin(
				role({ write: ['/admin/*'] }),
				role({ write: ['/admin/*'], forbidden: ['/admin/nostr/*'] })
			)
		).toBe(false);
	});

	it('rejects POS options the caller does not have', () => {
		expect(isRoleWithin(role({}, true), role({}))).toBe(false);
	});

	it('compares a pattern without a trailing star to a longer forbidden path', () => {
		const caller = role({ write: ['/admin/*'], forbidden: ['/admin/nostr/relays/*'] });
		expect(isRoleWithin(role({ write: ['/admin'] }), caller)).toBe(true);
		expect(isRoleWithin(role({ write: ['/admin/nostr'] }), caller)).toBe(true);
		expect(isRoleWithin(role({ write: ['/admin/nostr/relays'] }), caller)).toBe(false);
	});
});

describe('isAllowedOnPage', () => {
	it('reads a pattern without a trailing star as that page only', () => {
		const exact = role({ write: ['/admin/product'], forbidden: ['/admin/order'] });
		expect(isAllowedOnPage(exact, '/admin/product', 'write')).toBe(true);
		expect(isAllowedOnPage(exact, '/admin/product/new', 'write')).toBe(false);
		expect(isAllowedOnPage(role({ write: ['/admin/*'] }), '/admin/product/new', 'write')).toBe(
			true
		);
	});

	it('lets a pattern without a trailing star forbid that page only', () => {
		const caller = role({ write: ['/admin/*'], forbidden: ['/admin/order'] });
		expect(isAllowedOnPage(caller, '/admin/order', 'read')).toBe(false);
		expect(isAllowedOnPage(caller, '/admin/order/42', 'read')).toBe(true);
	});
});
