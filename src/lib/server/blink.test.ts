import { createHash, randomBytes } from 'crypto';
import { describe, expect, it } from 'vitest';
import {
	graphqlEndpointForDomain,
	mapGraphqlInvoiceStatus,
	parseLnAddress,
	validatePreimage
} from './blink';

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
});
