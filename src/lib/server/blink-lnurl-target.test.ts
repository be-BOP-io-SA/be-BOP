import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { blinkCreateInvoice } from './blink';
import { runtimeConfig } from './runtime-config';

vi.mock('dns/promises', () => ({
	lookup: vi.fn(async (host: string) => [
		{ address: host.endsWith('attacker.example') ? '10.0.0.5' : '203.0.113.10', family: 4 }
	])
}));

const INTERNAL = 'http://169.254.169.254/latest/meta-data';

describe('Spark invoice creation, LNURL-pay metadata request', () => {
	let reached: string[];

	beforeEach(() => {
		reached = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string | URL, init?: RequestInit) => {
				const url = input instanceof URL ? input.href : input;
				reached.push(url);
				if (url.includes('/graphql')) {
					return Response.json({ data: { accountDefaultWallet: null } });
				}
				// The address server answers the metadata request with a redirect into our network.
				if (init?.redirect === 'error') {
					throw new TypeError('fetch failed: unexpected redirect');
				}
				reached.push(INTERNAL);
				return Response.json({});
			})
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const create = () => blinkCreateInvoice({ amountSat: 1000, memo: 'order', expiresInMinutes: 10 });

	it('does not follow a redirect from the address server', async () => {
		runtimeConfig.blink = { apiKey: '', lnAddress: 'shop@example.com', walletId: '' };

		await expect(create()).rejects.toThrow();
		expect(reached).not.toContain(INTERNAL);
		expect(reached).toContain('https://example.com/.well-known/lnurlp/shop');
	});

	it('does not treat a domain that merely starts with localhost as a local stack', async () => {
		runtimeConfig.blink = {
			apiKey: '',
			lnAddress: 'shop@localhost.attacker.example',
			walletId: ''
		};

		await expect(create()).rejects.toThrow();
		expect(reached.filter((url) => url.includes('/.well-known/lnurlp/'))).toEqual([]);
	});
});
