import { describe, expect, it } from 'vitest';
import { countryFromIp } from './geoip';

describe('countryFromIp', () => {
	it.each(['', 'not-an-ip'])('finds no country for %j', (ip) => {
		expect(countryFromIp(ip)).toBeUndefined();
	});

	it('still places the loopback address in France', () => {
		expect(countryFromIp('127.0.0.1')).toBe('FR');
	});
});
