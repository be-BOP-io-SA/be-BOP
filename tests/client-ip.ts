import { test as base, type PlaywrightTestOptions } from '@playwright/test';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

export { expect } from '@playwright/test';
export type { APIRequestContext, BrowserContext, Locator, Page } from '@playwright/test';

/**
 * The shop allows 30 submissions a minute per address, fewer than the suite makes: each spec
 * file calls from its own address, read by the server through `ADDRESS_HEADER`.
 */
export const test = base.extend<Pick<PlaywrightTestOptions, 'extraHTTPHeaders'>>({
	extraHTTPHeaders: async ({ extraHTTPHeaders }, use, testInfo) => {
		const [high, low] = createHash('sha256').update(basename(testInfo.file)).digest();
		// 198.18.0.0/15 is reserved for network tests, so it never names a real visitor.
		await use({ ...extraHTTPHeaders, 'x-forwarded-for': `198.18.${high}.${low}` });
	}
});
