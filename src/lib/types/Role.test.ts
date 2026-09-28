import { describe, expect, it } from 'vitest';
import { isRoleWithin, type Role } from './Role';

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
});
