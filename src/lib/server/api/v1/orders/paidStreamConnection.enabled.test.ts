import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runtimeConfig } from '$lib/server/runtime-config';
import { cleanDb } from '$lib/server/test-utils';
import { closeAllStreams, countOpenStreams, openPaidOrderStream } from './paidStreamConnection';
import { resetPaidOrderStreamHub } from './paidStreamHub';

// Shortened from the real 25 s: what is asserted is that the switch is read at each beat.
vi.mock('./paidStream', async (importOriginal) => ({
	...(await importOriginal<typeof import('./paidStream')>()),
	SSE_HEARTBEAT_MS: 20
}));

const open = (keyId: string) =>
	openPaidOrderStream({ keyId, after: null, feed: 'all', render: () => null });

describe('a stream already open when the API is switched off', () => {
	let before: typeof runtimeConfig.apiV1;

	beforeEach(async () => {
		await cleanDb();
		before = runtimeConfig.apiV1;
		runtimeConfig.apiV1 = { ...before, enabled: true };
	});

	afterEach(() => {
		runtimeConfig.apiV1 = before;
		closeAllStreams();
		resetPaidOrderStreamHub();
	});

	it('stays open while the API is on, beat after beat', async () => {
		open('beating-key');

		await new Promise((resolve) => setTimeout(resolve, 120));

		expect(countOpenStreams('beating-key')).toBe(1);
	});

	it('is closed at its next beat when another server of the shop switched the API off', async () => {
		const res = open('other-server-key');
		expect(countOpenStreams('other-server-key')).toBe(1);

		// What the setting becomes here once the change reaches this server.
		runtimeConfig.apiV1 = { ...runtimeConfig.apiV1, enabled: false };

		await vi.waitFor(() => expect(countOpenStreams('other-server-key')).toBe(0), {
			timeout: 2_000
		});
		// The device sees its stream end rather than a connection gone quiet.
		const reader = res.body?.getReader();
		for (;;) {
			const frame = await reader?.read();
			if (!frame || frame.done) {
				break;
			}
		}
	});

	it('is closed at its next beat when the setting has no switch at all', async () => {
		open('old-setting-key');

		runtimeConfig.apiV1 = { corsOrigins: [], trustExternalPricing: false } as never;

		await vi.waitFor(() => expect(countOpenStreams('old-setting-key')).toBe(0), { timeout: 2_000 });
	});
});
