import { createHash, randomBytes } from 'crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	blinkLookupInvoice,
	extractPaymentHashFromVerifyUrl,
	graphqlEndpointForDomain,
	mapGraphqlInvoiceStatus,
	parseLnAddress,
	validatePreimage
} from './blink';
import { runtimeConfig } from './runtime-config';

describe('blink', () => {
	describe('parseLnAddress', () => {
		it('splits user@domain', () => {
			expect(parseLnAddress('alice@blink.sv')).toEqual({ username: 'alice', domain: 'blink.sv' });
		});
		it('defaults a bare username to blink.sv', () => {
			expect(parseLnAddress('alice')).toEqual({ username: 'alice', domain: 'blink.sv' });
		});
		it('lowercases username and domain', () => {
			expect(parseLnAddress('Alice@Blink.SV')).toEqual({ username: 'alice', domain: 'blink.sv' });
		});
		it('rejects empty input', () => {
			expect(() => parseLnAddress('@blink.sv')).toThrow();
			expect(() => parseLnAddress('alice@')).toThrow();
		});
	});

	describe('graphqlEndpointForDomain', () => {
		it('maps blink.sv to api.blink.sv', () => {
			expect(graphqlEndpointForDomain('blink.sv')).toBe('https://api.blink.sv/graphql');
		});
		it('prefixes api. for other domains', () => {
			expect(graphqlEndpointForDomain('example.com')).toBe('https://api.example.com/graphql');
		});
		it('does not double-prefix api.', () => {
			expect(graphqlEndpointForDomain('api.blink.sv')).toBe('https://api.blink.sv/graphql');
		});
		it('uses http for localhost', () => {
			expect(graphqlEndpointForDomain('localhost:4455')).toBe('http://api.localhost:4455/graphql');
		});
	});

	describe('mapGraphqlInvoiceStatus', () => {
		it('maps PAID to paid', () => {
			expect(mapGraphqlInvoiceStatus('PAID')).toBe('paid');
		});
		it('maps EXPIRED to expired', () => {
			expect(mapGraphqlInvoiceStatus('EXPIRED')).toBe('expired');
		});
		it('maps PENDING and unknown/null to pending', () => {
			expect(mapGraphqlInvoiceStatus('PENDING')).toBe('pending');
			expect(mapGraphqlInvoiceStatus(null)).toBe('pending');
			expect(mapGraphqlInvoiceStatus(undefined)).toBe('pending');
			expect(mapGraphqlInvoiceStatus('SOMETHING_ELSE')).toBe('pending');
		});
	});

	describe('validatePreimage', () => {
		it('accepts a preimage whose sha256 equals the payment hash', () => {
			const preimage = randomBytes(32).toString('hex');
			const paymentHash = createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
			expect(validatePreimage(preimage, paymentHash)).toBe(true);
		});
		it('is case-insensitive on the payment hash', () => {
			const preimage = randomBytes(32).toString('hex');
			const paymentHash = createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
			expect(validatePreimage(preimage, paymentHash.toUpperCase())).toBe(true);
		});
		it('rejects a mismatched preimage', () => {
			const preimage = randomBytes(32).toString('hex');
			const wrongHash = createHash('sha256').update(Buffer.from('deadbeef', 'hex')).digest('hex');
			expect(validatePreimage(preimage, wrongHash)).toBe(false);
		});
		it('rejects a malformed preimage', () => {
			expect(validatePreimage('not-hex', 'a'.repeat(64))).toBe(false);
			expect(validatePreimage('abcd', 'a'.repeat(64))).toBe(false);
		});
	});

	describe('extractPaymentHashFromVerifyUrl', () => {
		const HASH = 'a'.repeat(64);
		it('extracts the hash from a standard verify URL', () => {
			expect(extractPaymentHashFromVerifyUrl(`https://lnurl.blink.sv/verify/${HASH}`)).toBe(HASH);
		});
		it('tolerates a trailing slash and query string', () => {
			expect(extractPaymentHashFromVerifyUrl(`https://lnurl.blink.sv/verify/${HASH}/`)).toBe(HASH);
			expect(extractPaymentHashFromVerifyUrl(`https://lnurl.blink.sv/verify/${HASH}?x=1`)).toBe(
				HASH
			);
		});
		it('lowercases the hash', () => {
			expect(
				extractPaymentHashFromVerifyUrl(`https://lnurl.blink.sv/verify/${'A'.repeat(64)}`)
			).toBe(HASH);
		});
		it('rejects a non-64-hex last segment', () => {
			expect(extractPaymentHashFromVerifyUrl('https://lnurl.blink.sv/verify/abc')).toBeNull();
			expect(extractPaymentHashFromVerifyUrl('https://lnurl.blink.sv/verify/')).toBeNull();
			expect(extractPaymentHashFromVerifyUrl('https://lnurl.blink.sv/')).toBeNull();
		});
		it('rejects a non-URL', () => {
			expect(extractPaymentHashFromVerifyUrl('not a url')).toBeNull();
		});
	});

	describe('blinkLookupInvoice (spark, fail-closed preimage)', () => {
		const preimage = randomBytes(32).toString('hex');
		const paymentHash = createHash('sha256').update(Buffer.from(preimage, 'hex')).digest('hex');
		const verifyUrl = `https://lnurl.blink.sv/verify/${paymentHash}`;

		function mockVerify(body: unknown, ok = true, status = 200) {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => ({ ok, status, statusText: ok ? 'OK' : 'ERR', json: async () => body }))
			);
		}

		beforeEach(() => {
			runtimeConfig.blink = { apiKey: '', lnAddress: 'you@blink.sv', walletId: '' };
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('marks paid only when settled with a matching preimage', async () => {
			mockVerify({ status: 'OK', settled: true, preimage });
			expect(await blinkLookupInvoice(paymentHash, verifyUrl)).toBe('paid');
		});

		it('does NOT mark paid when settled but preimage is missing', async () => {
			mockVerify({ status: 'OK', settled: true });
			expect(await blinkLookupInvoice(paymentHash, verifyUrl)).toBe('pending');
		});

		it('does NOT mark paid when settled but preimage mismatches', async () => {
			mockVerify({ status: 'OK', settled: true, preimage: 'b'.repeat(64) });
			expect(await blinkLookupInvoice(paymentHash, verifyUrl)).toBe('pending');
		});

		it('stays pending when not yet settled', async () => {
			mockVerify({ status: 'OK', settled: false });
			expect(await blinkLookupInvoice(paymentHash, verifyUrl)).toBe('pending');
		});

		it('maps status:ERROR to failed (stops polling)', async () => {
			mockVerify({ status: 'ERROR', reason: 'unknown invoice' });
			expect(await blinkLookupInvoice(paymentHash, verifyUrl)).toBe('failed');
		});

		it('treats a non-OK HTTP response as transient pending', async () => {
			mockVerify({}, false, 500);
			expect(await blinkLookupInvoice(paymentHash, verifyUrl)).toBe('pending');
		});
	});
});
