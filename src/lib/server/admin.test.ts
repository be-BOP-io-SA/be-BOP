import { describe, expect, it } from 'vitest';
import { adminPathPrefix, isAdminAuthPath, routedPathname } from './admin';
import { match as adminHashMatch } from '../../params/admin_hash';

describe('adminPathPrefix', () => {
	it('recognises the plain and hashed admin prefixes', () => {
		expect(adminPathPrefix('/admin')).toBe('/admin');
		expect(adminPathPrefix('/admin/arm')).toBe('/admin');
		expect(adminPathPrefix('/admin-abc123/arm')).toBe('/admin-abc123');
	});

	it('leaves non-admin paths alone', () => {
		expect(adminPathPrefix('/')).toBeNull();
		expect(adminPathPrefix('/product/mug')).toBeNull();
		expect(adminPathPrefix('/order/1234')).toBeNull();
	});

	// These route to `(app)/[slug]`, not the admin tree. Reading them as admin 403s a public
	// CMS page for every visitor and slips it past maintenance mode and the age wall.
	it('leaves a CMS slug that merely starts with admin alone', () => {
		expect(adminPathPrefix('/administration')).toBeNull();
		expect(adminPathPrefix('/admins')).toBeNull();
		expect(adminPathPrefix('/adminfoo/bar')).toBeNull();
	});
});

// The route `(app)/admin[[hash=admin_hash]]` accepts any first segment that starts with `admin`
// and whose remainder satisfies the matcher. Every such path MUST read as admin to the guard,
// or it reaches the admin tree with none of the checks in hooks.server.ts having run.
describe('the guard and the route matcher agree', () => {
	const remainders = ['', '-abc', '-ABC123', 'x-1', 'ZZ-9', '-', 'foo', '-a-b'];

	it.each(remainders)('classifies /admin%s/arm consistently', (remainder) => {
		const pathname = `/admin${remainder}/arm`;
		const routes = remainder === '' || adminHashMatch(remainder);

		if (routes) {
			expect(adminPathPrefix(pathname)).toBe(`/admin${remainder}`);
		}
	});

	it('no longer routes a prefix that is not a hash', () => {
		expect(adminHashMatch('x-1')).toBe(false);
		expect(adminHashMatch('ZZ-9')).toBe(false);
		expect(adminHashMatch('-abc')).toBe(true);
	});
});

describe('isAdminAuthPath', () => {
	it('recognises the login and logout pages under either prefix', () => {
		expect(isAdminAuthPath('/admin/login')).toBe(true);
		expect(isAdminAuthPath('/admin-abc123/login')).toBe(true);
		expect(isAdminAuthPath('/admin-abc123/login/recovery')).toBe(true);
		expect(isAdminAuthPath('/admin-abc123/login/reset/some-token')).toBe(true);
		expect(isAdminAuthPath('/admin-abc123/logout')).toBe(true);
	});

	// Each of these routes to a real admin page with `login` as its dynamic parameter.
	it('refuses a login segment deeper in the path', () => {
		expect(isAdminAuthPath('/admin-abc123/oauth/login')).toBe(false);
		expect(isAdminAuthPath('/admin-abc123/config/vat/login')).toBe(false);
		expect(isAdminAuthPath('/admin-abc123/theme/login')).toBe(false);
		expect(isAdminAuthPath('/admin/arm/role/logout')).toBe(false);
	});

	it('refuses paths outside the admin tree or merely prefixed by login', () => {
		expect(isAdminAuthPath('/login')).toBe(false);
		expect(isAdminAuthPath('/admin/loginx')).toBe(false);
	});
});

// The router decodes before matching, so a guard reading the raw pathname sees a public URL
// where the router sees an admin one.
describe('routedPathname', () => {
	it('decodes what the router decodes', () => {
		expect(routedPathname('/%61dmin/arm')).toBe('/admin/arm');
		expect(routedPathname('/admin/%61rm')).toBe('/admin/arm');
		expect(routedPathname('/%70os/session')).toBe('/pos/session');
	});

	it('leaves an already-plain path alone', () => {
		expect(routedPathname('/admin/arm')).toBe('/admin/arm');
		expect(routedPathname('/product/mug')).toBe('/product/mug');
	});

	it('keeps an encoded percent encoded, as the router does', () => {
		expect(routedPathname('/%2561dmin/arm')).toBe('/%2561dmin/arm');
	});

	it('makes encoded admin paths read as admin', () => {
		expect(adminPathPrefix(routedPathname('/%61dmin/backup/create'))).toBe('/admin');
		expect(adminPathPrefix('/%61dmin/backup/create')).toBeNull();
	});
});
