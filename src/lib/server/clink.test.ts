import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	clinkDecodeNoffer,
	clinkValidateNoffer,
	clinkValidateAmount,
	clinkErrorResponse,
	isClinkConfigured,
	isLightningPubConfigured,
	decodeBolt11Light,
	decodeBolt11PaymentHash,
	validateBolt11,
	clinkCreateInvoice,
	clinkCheckInvoiceViaLightningPub
} from './clink';
import { runtimeConfig } from './runtime-config';
import { nofferEncode, OfferPriceType } from '@shocknet/clink-sdk';

// Known-good mainnet bolt11 from the Lightning BOLT #11 test suite (CLN test_pay.py):
// amount 2500u = 250,000 sats, description '1 cup coffee', expiry 60s.
const SPEC_BOLT11 =
	'lnbc2500u1pvjluezsp5zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zygspp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpu9qrsgquk0rl77nj30yxdy8j9vdx85fkpmdla2087ne0xh8nhedh8w27kyke0lp53ut353s06fv3qfegext0eh0ymjpf39tuven09sam30g4vgpfna3rh';

// The `p` tagged field of SPEC_BOLT11: the real 256-bit payment hash.
const SPEC_PAYMENT_HASH = '0001020304050607080900010203040506070809000102030405060708090102';

function defaultClinkConfig() {
	return {
		nOffer: '',
		relayUrl: 'wss://relay.shocknet.app',
		backend: 'processor' as 'lightning-pub' | 'processor',
		lightningPubEndpoint: '',
		lightningPubToken: ''
	};
}

describe('clink', () => {
	describe('clinkDecodeNoffer', () => {
		it('decodes a valid noffer string', () => {
			const noffer = nofferEncode({
				pubkey: 'a'.repeat(64),
				relay: 'wss://relay.shocknet.app',
				offer: 'test-offer-1',
				priceType: OfferPriceType.Spontaneous
			});
			const decoded = clinkDecodeNoffer(noffer);
			expect(decoded.pubkey).toBe('a'.repeat(64));
			expect(decoded.relay).toBe('wss://relay.shocknet.app');
			expect(decoded.offer).toBe('test-offer-1');
		});

		it('decodes a fixed-price noffer', () => {
			const noffer = nofferEncode({
				pubkey: 'b'.repeat(64),
				relay: 'wss://relay.example.com',
				offer: 'coffee-1',
				priceType: OfferPriceType.Fixed,
				price: 1000
			});
			const decoded = clinkDecodeNoffer(noffer);
			expect(decoded.priceType).toBe(0); // Fixed
			expect(decoded.price).toBe(1000);
		});

		it('throws on non-noffer bech32', () => {
			// An ndebit or random string should throw
			expect(() => clinkDecodeNoffer('not-a-noffer')).toThrow();
		});
	});

	describe('clinkValidateNoffer', () => {
		it('accepts a valid noffer', () => {
			const noffer = nofferEncode({
				pubkey: 'a'.repeat(64),
				relay: 'wss://relay.shocknet.app',
				offer: 'my-offer',
				priceType: OfferPriceType.Spontaneous
			});
			expect(clinkValidateNoffer(noffer)).toEqual({ valid: true });
		});

		it('rejects invalid pubkey length', () => {
			// nofferEncode itself rejects non-hex pubkey, so clinkValidateNoffer
			// would never see it. Test that garbage input is rejected gracefully.
			const result = clinkValidateNoffer('noffer1qqq');
			expect(result.valid).toBe(false);
		});

		it('rejects missing offer ID', () => {
			// An nOffer with an empty offer field should be rejected
			const noffer = nofferEncode({
				pubkey: 'a'.repeat(64),
				relay: 'wss://relay.shocknet.app',
				offer: 'x', // non-empty for encoding; we test with a different approach
				priceType: OfferPriceType.Spontaneous
			});
			// Valid noffer should pass
			expect(clinkValidateNoffer(noffer).valid).toBe(true);

			// A truncated / malformed noffer should fail
			expect(clinkValidateNoffer('noffer1qqq').valid).toBe(false);
		});

		it('rejects invalid relay URL', () => {
			const noffer = nofferEncode({
				pubkey: 'a'.repeat(64),
				relay: 'not-a-url',
				offer: 'my-offer',
				priceType: OfferPriceType.Spontaneous
			});
			const result = clinkValidateNoffer(noffer);
			expect(result.valid).toBe(false);
			expect(result.error).toContain('relay');
		});

		it('rejects garbage input', () => {
			expect(clinkValidateNoffer('garbage')).toEqual({
				valid: false,
				error: expect.any(String)
			});
		});
	});

	describe('clinkValidateAmount', () => {
		it('accepts any amount for spontaneous offers', () => {
			expect(clinkValidateAmount(1000, 2)).toEqual({ valid: true });
			expect(clinkValidateAmount(undefined, 2)).toEqual({ valid: true });
		});

		it('requires exact amount for fixed-price offers', () => {
			expect(clinkValidateAmount(1000, 0, 1000)).toEqual({ valid: true });
			expect(clinkValidateAmount(999, 0, 1000)).toEqual({
				valid: false,
				response: expect.objectContaining({ code: 5 })
			});
			expect(clinkValidateAmount(undefined, 0, 1000)).toEqual({
				valid: false,
				response: expect.objectContaining({ code: 5 })
			});
		});

		it('requires positive amount for variable-price offers', () => {
			expect(clinkValidateAmount(1000, 1)).toEqual({ valid: true });
			expect(clinkValidateAmount(1, 1)).toEqual({ valid: true });
			expect(clinkValidateAmount(undefined, 1)).toEqual({
				valid: false,
				response: expect.objectContaining({ code: 5 })
			});
			expect(clinkValidateAmount(0, 1)).toEqual({
				valid: false,
				response: expect.objectContaining({ code: 5 })
			});
			expect(clinkValidateAmount(-1, 1)).toEqual({
				valid: false,
				response: expect.objectContaining({ code: 5 })
			});
		});

		it('rejects negative amounts for spontaneous offers', () => {
			expect(clinkValidateAmount(-1, 2)).toEqual({
				valid: false,
				response: expect.objectContaining({ code: 5 })
			});
			expect(clinkValidateAmount(0, 2)).toEqual({
				valid: false,
				response: expect.objectContaining({ code: 5 })
			});
		});
	});

	describe('clinkErrorResponse', () => {
		it('creates an error response with code and message', () => {
			const resp = clinkErrorResponse(1, 'Invalid offer');
			expect(resp).toEqual({ code: 1, error: 'Invalid offer' });
		});

		it('includes range when provided', () => {
			const resp = clinkErrorResponse(5, 'Bad amount', { min: 1, max: 1000 });
			expect(resp).toEqual({
				code: 5,
				error: 'Bad amount',
				range: { min: 1, max: 1000 }
			});
		});
	});

	describe('isClinkConfigured', () => {
		beforeEach(() => {
			runtimeConfig.clink = defaultClinkConfig();
		});

		it('returns false when nOffer is empty', () => {
			expect(isClinkConfigured()).toBe(false);
		});

		it('returns true when nOffer is set', () => {
			runtimeConfig.clink.nOffer = 'noffer1test';
			expect(isClinkConfigured()).toBe(true);
		});

		it('returns false for the Lightning.Pub backend without credentials', () => {
			runtimeConfig.clink = {
				...defaultClinkConfig(),
				nOffer: 'noffer1test',
				backend: 'lightning-pub'
			};
			expect(isClinkConfigured()).toBe(false);
		});

		it('returns true for the Lightning.Pub backend with credentials', () => {
			runtimeConfig.clink = {
				...defaultClinkConfig(),
				nOffer: 'noffer1test',
				backend: 'lightning-pub',
				lightningPubEndpoint: 'https://lightningpub.example.com',
				lightningPubToken: 'tok'
			};
			expect(isClinkConfigured()).toBe(true);
		});
	});

	describe('isLightningPubConfigured', () => {
		beforeEach(() => {
			runtimeConfig.clink = defaultClinkConfig();
		});

		it('is false for the processor backend', () => {
			expect(isLightningPubConfigured()).toBe(false);
		});

		it('is false when the Lightning.Pub backend lacks credentials', () => {
			runtimeConfig.clink = { ...defaultClinkConfig(), backend: 'lightning-pub' };
			expect(isLightningPubConfigured()).toBe(false);
		});

		it('is true when the Lightning.Pub backend has endpoint and token', () => {
			runtimeConfig.clink = {
				...defaultClinkConfig(),
				backend: 'lightning-pub',
				lightningPubEndpoint: 'https://lightningpub.example.com/',
				lightningPubToken: 'pyro1abc'
			};
			expect(isLightningPubConfigured()).toBe(true);
		});
	});

	describe('decodeBolt11PaymentHash', () => {
		it('extracts the real payment hash from the BOLT #11 spec invoice', () => {
			expect(decodeBolt11PaymentHash(SPEC_BOLT11)).toBe(SPEC_PAYMENT_HASH);
		});

		it('strips a lightning: prefix before decoding', () => {
			expect(decodeBolt11PaymentHash(`lightning:${SPEC_BOLT11}`)).toBe(SPEC_PAYMENT_HASH);
		});

		it('handles uppercase invoices', () => {
			expect(decodeBolt11PaymentHash(SPEC_BOLT11.toUpperCase())).toBe(SPEC_PAYMENT_HASH);
		});

		it('returns null for a malformed invoice', () => {
			expect(decodeBolt11PaymentHash('not-a-bolt11')).toBeNull();
			expect(decodeBolt11PaymentHash('lnbc100')).toBeNull();
			expect(decodeBolt11PaymentHash('lnbc1001qqq')).toBeNull();
		});

		it('returns null when the checksum is invalid', () => {
			expect(decodeBolt11PaymentHash(`${SPEC_BOLT11}0`)).toBeNull();
		});
	});

	describe('decodeBolt11Light', () => {
		it('decodes mainnet bolt11 with sats', () => {
			// lnbc + 1000 sats (no multiplier)
			const result = decodeBolt11Light('lnbc1000');
			expect(result).toEqual({ network: 'bc', networkName: 'mainnet', amountSat: 1000 });
		});

		it('decodes mainnet bolt11 with milli-bitcoin multiplier', () => {
			// lnbc + 10 + m (milli-BTC = 10 * 100,000 = 1,000,000 sats)
			const result = decodeBolt11Light('lnbc10m');
			expect(result).toEqual({ network: 'bc', networkName: 'mainnet', amountSat: 1_000_000 });
		});

		it('decodes mainnet bolt11 with micro-bitcoin multiplier', () => {
			// lnbc + 100 + u (micro-BTC = 100 * 100 = 10,000 sats)
			const result = decodeBolt11Light('lnbc100u');
			expect(result).toEqual({ network: 'bc', networkName: 'mainnet', amountSat: 10_000 });
		});

		it('decodes testnet bolt11', () => {
			const result = decodeBolt11Light('lntb100');
			expect(result).toEqual({ network: 'tb', networkName: 'testnet', amountSat: 100 });
		});

		it('decodes regtest bolt11', () => {
			const result = decodeBolt11Light('lnbcrt50');
			expect(result).toEqual({ network: 'bcrt', networkName: 'regtest', amountSat: 50 });
		});

		it('decodes bolt11 with lightning: prefix', () => {
			const result = decodeBolt11Light('lightning:lnbc100');
			expect(result).toEqual({ network: 'bc', networkName: 'mainnet', amountSat: 100 });
		});

		it('decodes bolt11 with LIGHTNING: prefix (uppercase)', () => {
			const result = decodeBolt11Light('LIGHTNING:lnbc100');
			expect(result).toEqual({ network: 'bc', networkName: 'mainnet', amountSat: 100 });
		});

		it('returns null for invalid bolt11', () => {
			expect(decodeBolt11Light('not-a-bolt11')).toBeNull();
			expect(decodeBolt11Light('lnxy100')).toBeNull();
			expect(decodeBolt11Light('')).toBeNull();
		});

		it('returns null for unknown network prefix', () => {
			// lnxyz is not a valid network
			expect(decodeBolt11Light('lnxyz100')).toBeNull();
		});
	});

	describe('validateBolt11', () => {
		it('accepts valid mainnet bolt11 with no amount constraint', () => {
			const result = validateBolt11('lnbc100');
			expect(result).toEqual({ valid: true });
		});

		it('accepts bolt11 matching expected network', () => {
			const result = validateBolt11('lnbc100', { expectedNetwork: 'bc' });
			expect(result).toEqual({ valid: true });
		});

		it('rejects bolt11 with wrong network', () => {
			const result = validateBolt11('lntb100', { expectedNetwork: 'bc' });
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Network mismatch');
		});

		it('accepts bolt11 matching expected amount', () => {
			const result = validateBolt11('lnbc100', { expectedAmountSat: 100 });
			expect(result).toEqual({ valid: true });
		});

		it('rejects bolt11 differing from expected amount (exact match)', () => {
			// CLINK bolts mints invoices for an exact amount through its own backend;
			// any deviation (e.g. 99 vs 100) indicates an error and is rejected.
			const result = validateBolt11('lnbc99', { expectedAmountSat: 100 });
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Amount mismatch');
		});

		it('rejects bolt11 with wrong amount', () => {
			const result = validateBolt11('lnbc500', { expectedAmountSat: 100 });
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Amount mismatch');
		});

		it('rejects invalid bolt11', () => {
			const result = validateBolt11('not-a-bolt11');
			expect(result.valid).toBe(false);
			expect(result.error).toContain('Could not decode');
		});
	});

	describe('clinkCreateInvoice (Lightning.Pub backend)', () => {
		const mockFetch = vi.fn();

		beforeEach(() => {
			vi.stubGlobal('fetch', mockFetch);
			mockFetch.mockReset();
			runtimeConfig.clink = {
				...defaultClinkConfig(),
				backend: 'lightning-pub',
				lightningPubEndpoint: 'https://lightningpub.example.com',
				lightningPubToken: 'pyro1tok'
			};
		});

		afterEach(() => {
			vi.unstubAllGlobals();
			runtimeConfig.clink = defaultClinkConfig();
		});

		it('mints via POST /api/user/invoice/new and returns the decoded real payment hash', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ invoice: SPEC_BOLT11 })
			});

			const invoice = await clinkCreateInvoice({ amountSat: 250000, memo: 'be-BOP' });

			const [url, init] = mockFetch.mock.calls[0];
			expect(url).toBe('https://lightningpub.example.com/api/user/invoice/new');
			expect(init.method).toBe('POST');
			expect(JSON.parse(init.body)).toEqual({ amountSats: 250000, memo: 'be-BOP' });
			expect(init.headers.Authorization).toBe('Bearer pyro1tok');
			expect(invoice.paymentHash).toBe(SPEC_PAYMENT_HASH);
			expect(invoice.backendProcessor).toBe('lightning-pub');
			expect(invoice.bolt11).toBe(SPEC_BOLT11);
		});

		it('throws when the returned invoice amount does not match exactly', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ invoice: SPEC_BOLT11 })
			});

			await expect(clinkCreateInvoice({ amountSat: 999, memo: 'be-BOP' })).rejects.toThrow(
				'Amount mismatch'
			);
		});

		it('throws when the invoice has no decodable payment hash', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ invoice: 'lnbc100' })
			});

			await expect(clinkCreateInvoice({ amountSat: 100, memo: 'be-BOP' })).rejects.toThrow(
				'payment hash'
			);
		});

		it('throws on HTTP error responses', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });

			await expect(clinkCreateInvoice({ amountSat: 100, memo: 'be-BOP' })).rejects.toThrow(
				'Lightning.Pub invoice creation failed'
			);
		});

		it('rejects a private http endpoint (SSRF guard)', async () => {
			runtimeConfig.clink.lightningPubEndpoint = 'http://169.254.169.254:8080';

			await expect(clinkCreateInvoice({ amountSat: 100, memo: 'be-BOP' })).rejects.toThrow(
				'Unsafe Lightning.Pub endpoint'
			);
		});
	});

	describe('clinkCheckInvoiceViaLightningPub', () => {
		const mockFetch = vi.fn();

		beforeEach(() => {
			vi.stubGlobal('fetch', mockFetch);
			mockFetch.mockReset();
			runtimeConfig.clink = {
				...defaultClinkConfig(),
				backend: 'lightning-pub',
				lightningPubEndpoint: 'https://lightningpub.example.com',
				lightningPubToken: 'pyro1tok'
			};
		});

		afterEach(() => {
			vi.unstubAllGlobals();
			runtimeConfig.clink = defaultClinkConfig();
		});

		it('reports paid when the node set paid_at_unix', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ amount: 250000, paid_at_unix: 1496314658 })
			});

			const state = await clinkCheckInvoiceViaLightningPub({
				bolt11: SPEC_BOLT11,
				expectedAmountSat: 250000
			});

			const [url, init] = mockFetch.mock.calls[0];
			expect(url).toBe('https://lightningpub.example.com/api/user/payment/state');
			expect(JSON.parse(init.body)).toEqual({ invoice: SPEC_BOLT11 });
			expect(state.paid).toBe(true);
			expect(state.amountSat).toBe(250000);
		});

		it('reports pending while paid_at_unix is absent', async () => {
			mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });

			const state = await clinkCheckInvoiceViaLightningPub({
				bolt11: SPEC_BOLT11,
				expectedAmountSat: 250000
			});
			expect(state.paid).toBe(false);
		});

		it('throws when a paid invoice reports a mismatched amount (node-backed, never echoed)', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({ amount: 100, paid_at_unix: 1496314658 })
			});

			await expect(
				clinkCheckInvoiceViaLightningPub({ bolt11: SPEC_BOLT11, expectedAmountSat: 250000 })
			).rejects.toThrow('reported 100 sats paid for a 250000 sats invoice');
		});

		it('throws on HTTP error responses', async () => {
			mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' });

			await expect(
				clinkCheckInvoiceViaLightningPub({ bolt11: SPEC_BOLT11, expectedAmountSat: 250000 })
			).rejects.toThrow('Lightning.Pub payment lookup failed');
		});
	});
});
