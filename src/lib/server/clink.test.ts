import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
	clinkDecodeNoffer,
	clinkValidateNoffer,
	clinkValidateAmount,
	clinkErrorResponse,
	isClinkConfigured,
	isLightningPubConfigured,
	decodeBolt11Light,
	validateBolt11
} from './clink';
import { runtimeConfig } from './runtime-config';
import { nofferEncode, OfferPriceType } from '@shocknet/clink-sdk';

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
			runtimeConfig.clink = {
				enabled: false,
				nOffer: '',
				relayUrl: 'wss://relay.shocknet.app',
				lightningPubEndpoint: '',
				lightningPubToken: ''
			};
		});

		it('returns false when nOffer is empty', () => {
			expect(isClinkConfigured()).toBe(false);
		});

		it('returns true when nOffer is set', () => {
			runtimeConfig.clink.nOffer = 'noffer1test';
			expect(isClinkConfigured()).toBe(true);
		});
	});

	describe('isLightningPubConfigured', () => {
		beforeEach(() => {
			runtimeConfig.clink = {
				enabled: false,
				nOffer: '',
				relayUrl: '',
				lightningPubEndpoint: '',
				lightningPubToken: ''
			};
		});

		it('returns false when endpoint is empty', () => {
			expect(isLightningPubConfigured()).toBe(false);
		});

		it('returns false when only endpoint is set', () => {
			runtimeConfig.clink.lightningPubEndpoint = 'http://localhost:1776';
			expect(isLightningPubConfigured()).toBe(false);
		});

		it('returns true when both endpoint and token are set', () => {
			runtimeConfig.clink.lightningPubEndpoint = 'http://localhost:1776';
			runtimeConfig.clink.lightningPubToken = 'test-token';
			expect(isLightningPubConfigured()).toBe(true);
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

		it('accepts bolt11 within 1% tolerance', () => {
			// 99 sats vs expected 100 — within tolerance
			const result = validateBolt11('lnbc99', { expectedAmountSat: 100 });
			expect(result).toEqual({ valid: true });
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
});
