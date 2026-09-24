import { expect, test as setup } from '@playwright/test';

export const ADMIN_STATE = 'playwright/.auth/admin.json';

const ADMIN_LOGIN = 'e2e-admin';
// Long and random enough not to appear in a breach corpus: the login form refuses a pwned
// password, and would otherwise fail for a reason that has nothing to do with the test.
const ADMIN_PASSWORD = 'e2e-Xk4pQ7-vR2nL9tB';

/**
 * Signs in once for the whole run and saves the session.
 *
 * Signing in per test would be both slower and wrong: the login route allows ten attempts per
 * IP per five minutes, so a suite that re-authenticates for every case starts failing with a
 * 429 partway through — and the failure looks like a broken page rather than a spent quota.
 *
 * be-BOP opens first-run administrator creation on the login form itself, so this same
 * submission creates the account on an empty database and signs in on a populated one, which
 * keeps the suite re-runnable.
 */
setup('sign in as the shop administrator', async ({ page }) => {
	await page.goto('/admin/login');

	await page.locator('input[name="login"]').fill(ADMIN_LOGIN);
	await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
	// The submit control is an `<input>`, labelled "Create Super Admin" on a fresh instance and
	// "Login" afterwards — selecting on the element keeps both cases working.
	await page.locator('input[type="submit"]').click();

	await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30_000 });
	await expect(page).toHaveURL(/\/admin$/);

	await page.context().storageState({ path: ADMIN_STATE });
});
