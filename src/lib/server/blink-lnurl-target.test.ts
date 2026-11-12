import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { blinkCreateInvoice } from './blink';
import { runtimeConfig } from './runtime-config';

vi.mock('dns/promises', () => ({
	lookup: vi.fn(async (host: string) => [
		{ address: host.endsWith('attacker.example') ? '10.0.0.5' : '203.0.113.10', family: 4 }
	])
}));

const INTERNAL = 'http://169.254.169.254/latest/meta-data';
const PAYMENT_HASH = 'a'.repeat(64);

describe('Spark invoice creation, LNURL-pay requests', () => {
	let reached: string[];
	/** Where the address server sends the metadata request, by address domain. */
	let metadataRedirects: Record<string, string>;

	beforeEach(() => {
		reached = [];
		metadataRedirects = {};
		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: string | URL, init?: RequestInit) => {
				const url = input instanceof URL ? input.href : input;
				const followsRedirects = !init?.redirect || init.redirect === 'follow';
				reached.push(url);
				if (url.includes('/graphql')) {
					return Response.json({ data: { accountDefaultWallet: null } });
				}
				const redirect = metadataRedirects[new URL(url).host];
				if (redirect && url.includes('/.well-known/lnurlp/')) {
					if (followsRedirects) {
						reached.push(redirect);
					}
					return new Response(null, { status: 301, headers: { location: redirect } });
				}
				if (url.includes('/.well-known/lnurlp/')) {
					return Response.json({ tag: 'payRequest', callback: `${new URL(url).origin}/cb` });
				}
				if (url.includes('/cb')) {
					return Response.json({
						pr: 'lnbc1invoice',
						verify: `${new URL(url).origin}/verify/${PAYMENT_HASH}`
					});
				}
				return Response.json({});
			})
		);
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const create = () => blinkCreateInvoice({ amountSat: 1000, memo: 'order', expiresInMinutes: 10 });

	it('follows a redirect from the address server to another public host', async () => {
		runtimeConfig.blink = { apiKey: '', lnAddress: 'shop@redirecting.example', walletId: '' };
		metadataRedirects['redirecting.example'] =
			'https://www.redirecting.example/.well-known/lnurlp/shop';

		await expect(create()).resolves.toMatchObject({
			paymentRequest: 'lnbc1invoice',
			paymentHash: PAYMENT_HASH
		});
	});

	it('does not follow a redirect from the address server into our network', async () => {
		runtimeConfig.blink = { apiKey: '', lnAddress: 'shop@example.com', walletId: '' };
		metadataRedirects['example.com'] = INTERNAL;

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
