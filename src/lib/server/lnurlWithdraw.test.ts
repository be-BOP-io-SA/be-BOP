import { beforeEach, describe, expect, it, vi } from 'vitest';

const isPhoenixdConfigured = vi.fn();

vi.mock('$lib/server/phoenixd', () => ({
	isPhoenixdConfigured: () => isPhoenixdConfigured()
}));
vi.mock('$lib/server/database', () => ({ collections: { lnurlWithdrawals: {} } }));
vi.mock('$lib/server/runtime-config', () => ({
	runtimeConfig: { phoenixd: { url: 'http://phoenixd.test', password: 'pw', enabled: true } }
}));
vi.mock('$lib/server/env-config', () => ({ ORIGIN: 'https://shop.example' }));

import { bech32 } from 'bech32';
import {
	checkWithdrawReadiness,
	encodeLnurl,
	withdrawFeeMarginSat,
	withdrawUrls
} from './lnurlWithdraw';

/** One fetch stub per phoenixd route, so a test only says what it cares about. */
function phoenixdAnswers(answers: {
	channels?: unknown[] | 'error' | 'throw';
	balanceSat?: number;
}) {
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string) => {
			if (answers.channels === 'throw') {
				throw new Error('ECONNREFUSED');
			}
			if (String(input).endsWith('/listchannels')) {
				if (answers.channels === 'error') {
					return new Response('nope', { status: 500 });
				}
				return new Response(JSON.stringify(answers.channels ?? [{ channelId: 'a' }]));
			}
			return new Response(JSON.stringify({ balanceSat: answers.balanceSat ?? 100_000 }));
		})
	);
}

describe('checkWithdrawReadiness', () => {
	beforeEach(() => {
		isPhoenixdConfigured.mockReset();
		isPhoenixdConfigured.mockReturnValue(true);
	});

	it('refuses when phoenixd is not configured, without calling it', async () => {
		isPhoenixdConfigured.mockReturnValue(false);
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);

		const readiness = await checkWithdrawReadiness(1000);
		expect(readiness).toMatchObject({ ready: false, blocker: 'NOT_CONFIGURED' });
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('refuses when phoenixd cannot be reached', async () => {
		phoenixdAnswers({ channels: 'throw' });
		await expect(checkWithdrawReadiness(1000)).resolves.toMatchObject({
			ready: false,
			blocker: 'UNREACHABLE'
		});
	});

	it('refuses when phoenixd answers with an error', async () => {
		phoenixdAnswers({ channels: 'error' });
		await expect(checkWithdrawReadiness(1000)).resolves.toMatchObject({
			ready: false,
			blocker: 'UNREACHABLE'
		});
	});

	it('refuses when no channel is open', async () => {
		phoenixdAnswers({ channels: [] });
		await expect(checkWithdrawReadiness(1000)).resolves.toMatchObject({
			ready: false,
			blocker: 'NO_CHANNELS'
		});
	});

	it('refuses when the balance does not cover the amount', async () => {
		phoenixdAnswers({ balanceSat: 500 });
		await expect(checkWithdrawReadiness(1000)).resolves.toMatchObject({
			ready: false,
			blocker: 'INSUFFICIENT_LIQUIDITY',
			details: { balanceSat: 500, requestedSat: 1000 }
		});
	});

	it('refuses when the balance covers the amount but not the fees', async () => {
		// 1000 sat asked, 10 sat of margin: a balance of exactly 1000 is not enough.
		phoenixdAnswers({ balanceSat: 1000 });
		await expect(checkWithdrawReadiness(1000)).resolves.toMatchObject({
			ready: false,
			blocker: 'INSUFFICIENT_LIQUIDITY',
			details: { neededSat: 1010 }
		});
	});

	it('accepts when the node is up, has a channel and enough balance', async () => {
		phoenixdAnswers({ balanceSat: 2000 });
		await expect(checkWithdrawReadiness(1000)).resolves.toEqual({
			ready: true,
			balanceSat: 2000
		});
	});
});

describe('withdrawFeeMarginSat', () => {
	it('never goes under the floor, however small the withdraw', () => {
		expect(withdrawFeeMarginSat(1)).toBe(10);
		expect(withdrawFeeMarginSat(100)).toBe(10);
	});

	it('grows with the amount', () => {
		expect(withdrawFeeMarginSat(100_000)).toBe(1000);
	});
});

describe('withdrawUrls', () => {
	it('gives the URL, the LNURL address and the scheme a wallet may prefer', () => {
		const urls = withdrawUrls('abc');

		expect(urls.url).toBe('https://shop.example/lnurlw/abc');
		expect(urls.lnurlw).toBe('lnurlw://shop.example/lnurlw/abc');
		expect(urls.lnurl).toMatch(/^LNURL1[0-9A-Z]+$/);
	});
});

describe('encodeLnurl', () => {
	it('encodes to something a wallet can decode back to the same URL', () => {
		const url = 'https://shop.example/lnurlw/9f1c2d3e-4b5a-6c7d-8e9f-0a1b2c3d4e5f';
		const decoded = bech32.decode(encodeLnurl(url).toLowerCase(), 2000);

		expect(decoded.prefix).toBe('lnurl');
		expect(Buffer.from(bech32.fromWords(decoded.words)).toString('utf8')).toBe(url);
	});

	it('stays uppercase, so the QR keeps its compact alphanumeric mode', () => {
		const lnurl = encodeLnurl('https://shop.example/lnurlw/abc');

		expect(lnurl).toBe(lnurl.toUpperCase());
	});

	it('encodes URLs past the 90-character bech32 default', () => {
		const url = `https://shop.example/lnurlw/${'a'.repeat(120)}`;

		expect(() => encodeLnurl(url)).not.toThrow();
	});
});
