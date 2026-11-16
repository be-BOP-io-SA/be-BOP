import { test as base, type PlaywrightTestOptions } from '@playwright/test';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

export { expect } from '@playwright/test';
export type { APIRequestContext, BrowserContext, Locator, Page } from '@playwright/test';

/** The suite makes more submissions than the shop allows one address, so each spec file has its own. */
export const test = base.extend<Pick<PlaywrightTestOptions, 'extraHTTPHeaders'>>({
	extraHTTPHeaders: async ({ extraHTTPHeaders }, use, testInfo) => {
		const [high, low] = createHash('sha256').update(basename(testInfo.file)).digest();
		// 198.18.0.0/15 is reserved for network tests, so it never names a real visitor.
		await use({ ...extraHTTPHeaders, 'x-forwarded-for': `198.18.${high}.${low}` });
	}
});
