import { describe, expect, it } from 'vitest';
import { ipToBuffer, ipv6Prefix64 } from './ip';

const hex = (ip: string) => ipToBuffer(ip).toString('hex');

describe('ipToBuffer', () => {
	it('gives an IPv4 address its four bytes', () => {
		expect([...ipToBuffer('127.0.0.1')]).toEqual([127, 0, 0, 1]);
		expect([...ipToBuffer('255.255.255.255')]).toEqual([255, 255, 255, 255]);
	});

	it('expands a full IPv6 address', () => {
		expect(hex('2001:0db8:85a3:0000:0000:8a2e:0370:7334')).toBe('20010db885a3000000008a2e03707334');
	});

	it('expands the zeros `::` stands for, wherever it sits', () => {
		expect(hex('::')).toBe('0'.repeat(32));
		expect(hex('::1')).toBe('0'.repeat(31) + '1');
		expect(hex('2001:db8::1')).toBe('20010db8' + '0'.repeat(23) + '1');
		expect(hex('fe80::')).toBe('fe80' + '0'.repeat(28));
	});

	it('folds an embedded IPv4 into the last two groups', () => {
		// The mapping the rate limiter and the geo lookup both rely on.
		expect(hex('::ffff:127.0.0.1')).toBe('0'.repeat(20) + 'ffff7f000001');
		expect(hex('::ffff:255.255.255.255')).toBe('0'.repeat(20) + 'ffffffffffff');
	});

	it('reads an address the same whatever its case', () => {
		expect(hex('::FFFF:127.0.0.1')).toBe(hex('::ffff:127.0.0.1'));
		expect(hex('2001:DB8::1')).toBe(hex('2001:db8::1'));
	});

	it('ignores the zone identifier', () => {
		expect(hex('fe80::1%eth0')).toBe(hex('fe80::1'));
	});

	it('always returns 16 bytes for IPv6 and 4 for IPv4', () => {
		expect(ipToBuffer('2001:db8::1')).toHaveLength(16);
		expect(ipToBuffer('::')).toHaveLength(16);
		expect(ipToBuffer('10.0.0.1')).toHaveLength(4);
	});

	it('refuses what is not an address', () => {
		expect(() => ipToBuffer('not-an-ip')).toThrow(TypeError);
		expect(() => ipToBuffer('999.1.1.1')).toThrow(TypeError);
		expect(() => ipToBuffer('')).toThrow(TypeError);
	});
});

describe('ipv6Prefix64', () => {
	it('keeps the first four groups', () => {
		expect(ipv6Prefix64('2001:0db8:85a3:1234:5678:8a2e:0370:7334')).toBe('2001:0db8:85a3:1234');
	});

	it('gives two addresses in one /64 the same key', () => {
		expect(ipv6Prefix64('2001:db8:1:2::1')).toBe(ipv6Prefix64('2001:db8:1:2:ffff:ffff:ffff:ffff'));
	});

	it('separates two different /64s', () => {
		expect(ipv6Prefix64('2001:db8:1:2::1')).not.toBe(ipv6Prefix64('2001:db8:1:3::1'));
	});

	it('pads so the key cannot collide across groups', () => {
		// Unpadded, `1:2:3:4` and `12:3:4:...` could join to the same string.
		expect(ipv6Prefix64('1:2:3:4::')).toBe('0001:0002:0003:0004');
	});
});
