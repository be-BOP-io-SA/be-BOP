import { describe, expect, it } from 'vitest';
import { isAdminPathDisabled } from './admin-disabled';

describe('isAdminPathDisabled', () => {
	it('returns false when the disabled list is empty', () => {
		expect(isAdminPathDisabled('/admin/sumup', [])).toBe(false);
	});

	it('returns false when the path does not match any entry', () => {
		expect(isAdminPathDisabled('/admin/nostr', ['/admin/sumup'])).toBe(false);
	});

	it('matches an exact disabled entry', () => {
		expect(isAdminPathDisabled('/admin/sumup', ['/admin/sumup'])).toBe(true);
	});

	it('matches a sub-path of a disabled entry', () => {
		expect(isAdminPathDisabled('/admin/sumup/connect', ['/admin/sumup'])).toBe(true);
	});

	it('does not match a sibling that shares a prefix', () => {
		// "/admin/sum" must NOT match "/admin/sumup"
		expect(isAdminPathDisabled('/admin/sumup', ['/admin/sum'])).toBe(false);
	});

	it('normalizes obfuscated admin prefix to /admin', () => {
		expect(isAdminPathDisabled('/admin-abc123/sumup', ['/admin/sumup'])).toBe(true);
		expect(isAdminPathDisabled('/admin-abc123/sumup/details', ['/admin/sumup'])).toBe(true);
	});

	it('respects any of multiple disabled entries', () => {
		expect(isAdminPathDisabled('/admin/paypal', ['/admin/sumup', '/admin/paypal'])).toBe(true);
	});
});
