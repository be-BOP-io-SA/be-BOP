import { describe, expect, it } from 'vitest';
import { bip84Address, bip48Address } from './bitcoin-nodeless';

describe('bitcoin-nodeless', () => {
	it('should derivate public key', () => {
		const zpub =
			'zpub6r8LffkeFh5if3FefxX5zq5oQnQbLxXXPE87fEskLhY2v37Tj16TzMqRL7p32wQweeq1DpRYWrvm4t3ArKHrLNnVhPkFsHGdo3h6nyoppeS';

		expect(bip84Address(zpub, 0)).toBe('bc1qrw2swpufzdx9gy4aewv5q45e53stcf95ker0p7');
		expect(bip84Address(zpub, 1)).toBe('bc1qa07qeugkc8u7pjv98dejfdnd5ml7qxv88zwzrn');
		expect(bip84Address(zpub, 2)).toBe('bc1qlyaf3z5auqt0da07303xhhehqzxx797d3c67lr');
		expect(bip84Address(zpub, 3)).toBe('bc1qsh4z5ntmcva4a0aj5u2u9c6xsx4rdr4jw7m29f');
		expect(bip84Address(zpub, 4)).toBe('bc1qldvg4ldzcy8v00gvy7m22uv68fw7gz72ky7v6l');
		expect(bip84Address(zpub, 5)).toBe('bc1qlgxhugactwcmz57hsreydlpvldx4ud5aj8fhh4');
	});

	it('should derivate public key for testnet', () => {
		const vpub =
			'vpub5YoHT14yexuoFrVBLXNbAUhniupoaUZXin3EXfJCpg2WhdrYiNSDW7CsFHyh3JoG26MnDv3JgDWZXjauyXdo9S46E2xZXdzgi9SXEiPyBUY';

		expect(bip84Address(vpub, 0)).toBe('tb1qrw2swpufzdx9gy4aewv5q45e53stcf95ulcu6d');
		expect(bip84Address(vpub, 1)).toBe('tb1qa07qeugkc8u7pjv98dejfdnd5ml7qxv8dy43cq');
		expect(bip84Address(vpub, 2)).toBe('tb1qlyaf3z5auqt0da07303xhhehqzxx797dm7pdys');
		expect(bip84Address(vpub, 3)).toBe('tb1qsh4z5ntmcva4a0aj5u2u9c6xsx4rdr4jycqe76');
		expect(bip84Address(vpub, 4)).toBe('tb1qldvg4ldzcy8v00gvy7m22uv68fw7gz72uz9lpv');
		expect(bip84Address(vpub, 5)).toBe('tb1qlgxhugactwcmz57hsreydlpvldx4ud5acpjyvx');
	});

	it('should accept mainnet xpub and derive the same bc1 addresses as zpub', () => {
		// Same underlying key as the zpub in the first test, re-encoded with xpub version bytes.
		const xpub =
			'xpub6CTp4LQoxKzkxSsR1Ewqaeto4r7hTiYXZ15g6T5yagnGoqV1DgmLkEX9Hhts3876qNbPisERbYDfJJp3QvTpjuRHxiMQhTdfFbZp1r41xFu';

		expect(bip84Address(xpub, 0)).toBe('bc1qrw2swpufzdx9gy4aewv5q45e53stcf95ker0p7');
		expect(bip84Address(xpub, 3)).toBe('bc1qsh4z5ntmcva4a0aj5u2u9c6xsx4rdr4jw7m29f');
	});

	it('should accept testnet tpub and derive the same tb1 addresses as vpub', () => {
		// Same underlying key as the vpub in the previous test, re-encoded with tpub version bytes.
		const tpub =
			'tpubDCqSaaEVfbxDEF4GTRvvnaEAPyDMT73b6dfyT197vbYAZ89iHucRtgByXjyeZd4LdH8JLSkJ8e3hzVJeonK4dLsb2K6iNzHtqZADmnTZqX3';

		expect(bip84Address(tpub, 0)).toBe('tb1qrw2swpufzdx9gy4aewv5q45e53stcf95ulcu6d');
		expect(bip84Address(tpub, 3)).toBe('tb1qsh4z5ntmcva4a0aj5u2u9c6xsx4rdr4jycqe76');
	});

	it('should throw for unsupported extended key prefix', () => {
		expect(() => bip84Address('ypub6CTp4LQoxKzkxSsR1Ewqaeto4r7hTiYXZ15g6T5yagnGoqV', 0)).toThrow();
	});

	describe('bip48 address derivation', () => {
		const testnetXpubs = [
			'tpubDFErwxEibF1d8NwR7wG9KUz94F8JAFJJPz5GQFeGVcz6ssgEr5nWsPkpbcpn6KPcDPgYrSofnya2kbm196He327iWCRK9nVkxuz8ZjT9cXG',
			'tpubDF6CqZd1yujcP79jyEvuC4f5rMNByCqgomZhtfgV6LprZGoxxmzH5LuDPvybL8rzCzJpXynsSARzmN9SoYdLKpLq5ZGwED6vE4mXpLS6gDH'
		];

		const testnetXpubs3 = [
			...testnetXpubs,
			'tpubDFhQCkPCwwcaMPrmzrbqM4SKcea9Uj1sXnpx3Q9ezZhsxn9cP8Csbt1cw39yA3YmqFNU2UNMXUaWD1vmU5f5TdvB2ZMW3hvTYqjKLmtVztt'
		];

		it('should derive P2WSH multisig address for testnet (2-of-2)', () => {
			const address = bip48Address(2, testnetXpubs, 0);
			expect(address).toMatch(/^tb1q/);
			expect(address.length).toBeGreaterThan(42);
		});

		it('should derive P2WSH multisig address for testnet (2-of-3)', () => {
			const address = bip48Address(2, testnetXpubs3, 0);
			expect(address).toMatch(/^tb1q/);
			expect(address.length).toBeGreaterThan(42);
		});

		it('should derive deterministic addresses (same inputs → same output)', () => {
			const addr1 = bip48Address(2, testnetXpubs, 0);
			const addr2 = bip48Address(2, testnetXpubs, 0);
			expect(addr1).toBe(addr2);
		});

		it('should derive different addresses for different indices', () => {
			const addr0 = bip48Address(2, testnetXpubs, 0);
			const addr1 = bip48Address(2, testnetXpubs, 1);
			const addr2 = bip48Address(2, testnetXpubs, 2);
			expect(addr0).not.toBe(addr1);
			expect(addr1).not.toBe(addr2);
			expect(addr0).not.toBe(addr2);
		});

		it('should derive different addresses for different M values', () => {
			const addr_1of3 = bip48Address(1, testnetXpubs3, 0);
			const addr_2of3 = bip48Address(2, testnetXpubs3, 0);
			const addr_3of3 = bip48Address(3, testnetXpubs3, 0);
			expect(addr_1of3).not.toBe(addr_2of3);
			expect(addr_2of3).not.toBe(addr_3of3);
		});

		it('should throw for invalid xpubs', () => {
			expect(() => bip48Address(2, ['invalid1', 'invalid2'], 0)).toThrow();
		});

		it('should detect testnet from tpub prefix', () => {
			const address = bip48Address(2, testnetXpubs, 0);
			expect(address).toMatch(/^tb1/);
		});

		it('should throw for unknown xpub prefix instead of silently defaulting to testnet', () => {
			// Guard against silent mis-derivation: pasting a prefix we don't recognize
			// must NOT produce a testnet address against real mainnet funds.
			expect(() => bip48Address(2, ['qpub1234567890', 'qpub1234567890'], 0)).toThrow(
				/Unsupported extended key prefix/
			);
		});

		it('should accept canonical Vpub (SLIP-132 P2WSH testnet) and yield same address as tpub', () => {
			const VpubCosigners = [
				'Vpub5n6nwcoe9ZXaaZXhwhAnXToa6yn1VyVqLQ6CQB4tmUJreZwz2wzaZwde7snJ8SMRqfz1cW6oDmRPR1f2c4mKhbQtYPPZhqfYjEYJcUNQ1Ts',
				'Vpub5mx8qEBwYEFZqHk2nzqYQ3UWu61uJw3DkBadtb77NC9cKy5i9eCLmtn2vBw7NFpoqGcHJ35zrxHMRn3UGX71zPe17kFBnGGhzPKhs2pQqQY'
			];
			const fromVpub = bip48Address(2, VpubCosigners, 0);
			const fromTpub = bip48Address(2, testnetXpubs, 0);
			expect(fromVpub).toBe(fromTpub);
			expect(fromVpub).toMatch(/^tb1q/);
		});
	});
});
