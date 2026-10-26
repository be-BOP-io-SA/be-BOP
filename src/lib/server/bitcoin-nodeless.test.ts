import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	bip84Address,
	bip48Address,
	generateNodelessAddress,
	getSatoshiReceivedNodeless,
	reserveNodelessAddress
} from './bitcoin-nodeless';
import { runtimeConfig } from './runtime-config';
import { collections } from './database';
import { cleanDb } from './test-utils';
import { getProcessor, resolveProcessor } from './sdk/pp';
import './sdk/pp-registry';

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

describe('getSatoshiReceivedNodeless', () => {
	const ADDRESS = 'bc1qrw2swpufzdx9gy4aewv5q45e53stcf95ker0p7';
	const BLOCK_HEIGHT = 100;
	const orderCreatedAt = new Date('2026-06-01T00:00:00Z');
	const AMOUNT = 100_000;

	const secs = (d: Date) => Math.floor(d.getTime() / 1000);

	// One inbound TX paying AMOUNT to ADDRESS. `blockHeight`/`blockTime` omitted → mempool.
	function makeTx(opts: { blockHeight?: number; blockTime?: Date; amount?: number } = {}) {
		const confirmed = opts.blockHeight !== undefined && opts.blockTime !== undefined;
		return {
			txid: `tx-${opts.blockHeight ?? 'mempool'}-${opts.blockTime?.getTime() ?? 0}`,
			status: confirmed
				? {
						confirmed: true,
						block_height: opts.blockHeight,
						block_time: secs(opts.blockTime ?? orderCreatedAt)
				  }
				: { confirmed: false },
			vout: [{ scriptpubkey_address: ADDRESS, value: opts.amount ?? AMOUNT }]
		};
	}

	function mockFetchTxs(txs: unknown[]) {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => txs }))
		);
	}

	beforeEach(() => {
		runtimeConfig.bitcoinBlockHeight = BLOCK_HEIGHT;
		runtimeConfig.bitcoinNodeless = {
			...runtimeConfig.bitcoinNodeless,
			mempoolUrl: 'https://mempool.example'
		};
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('counts a full-amount mempool TX as pending, not received', async () => {
		mockFetchTxs([makeTx()]); // unconfirmed
		const res = await getSatoshiReceivedNodeless(ADDRESS, 1, orderCreatedAt);
		expect(res.satReceived).toBe(0);
		expect(res.pendingSatReceived).toBe(AMOUNT);
		expect(res.transactions).toHaveLength(0);
	});

	it('counts a confirmed-but-too-shallow TX as pending, not received', async () => {
		// block_height 100 with current tip 100 = 1 confirmation, threshold needs 3
		mockFetchTxs([makeTx({ blockHeight: 100, blockTime: new Date('2026-06-01T01:00:00Z') })]);
		const res = await getSatoshiReceivedNodeless(ADDRESS, 3, orderCreatedAt);
		expect(res.satReceived).toBe(0);
		expect(res.pendingSatReceived).toBe(AMOUNT);
	});

	it('counts a threshold-confirmed TX as received even when mined after the expiry window', async () => {
		// Regression guard: the old upper time-bound dropped TXs confirmed late.
		mockFetchTxs([makeTx({ blockHeight: 98, blockTime: new Date('2027-01-01T00:00:00Z') })]);
		const res = await getSatoshiReceivedNodeless(ADDRESS, 3, orderCreatedAt);
		expect(res.satReceived).toBe(AMOUNT);
		expect(res.pendingSatReceived).toBe(0);
		expect(res.transactions).toHaveLength(1);
	});

	it('ignores TXs mined before the order was created', async () => {
		mockFetchTxs([makeTx({ blockHeight: 50, blockTime: new Date('2026-05-01T00:00:00Z') })]);
		const res = await getSatoshiReceivedNodeless(ADDRESS, 3, orderCreatedAt);
		expect(res.satReceived).toBe(0);
		expect(res.pendingSatReceived).toBe(0);
		expect(res.transactions).toHaveLength(0);
	});

	it('counts a mempool TX as received when threshold is 0', async () => {
		mockFetchTxs([makeTx()]); // unconfirmed
		const res = await getSatoshiReceivedNodeless(ADDRESS, 0, orderCreatedAt);
		expect(res.satReceived).toBe(AMOUNT);
		expect(res.pendingSatReceived).toBe(0);
	});
});

describe('derivation index limit', () => {
	const LAST_INDEX = 2 ** 31 - 1;
	const exhausted = expect.objectContaining({ name: 'DerivationIndexExhaustedError' });
	const ZPUB =
		'zpub6r8LffkeFh5if3FefxX5zq5oQnQbLxXXPE87fEskLhY2v37Tj16TzMqRL7p32wQweeq1DpRYWrvm4t3ArKHrLNnVhPkFsHGdo3h6nyoppeS';
	const TESTNET_XPUBS = [
		'tpubDFErwxEibF1d8NwR7wG9KUz94F8JAFJJPz5GQFeGVcz6ssgEr5nWsPkpbcpn6KPcDPgYrSofnya2kbm196He327iWCRK9nVkxuz8ZjT9cXG',
		'tpubDF6CqZd1yujcP79jyEvuC4f5rMNByCqgomZhtfgV6LprZGoxxmzH5LuDPvybL8rzCzJpXynsSARzmN9SoYdLKpLq5ZGwED6vE4mXpLS6gDH'
	];
	const initialConfig = runtimeConfig.bitcoinNodeless;

	function configureBip84(derivationIndex: number, skipUsedAddresses = false) {
		runtimeConfig.bitcoinNodeless = {
			...initialConfig,
			format: 'bip84',
			publicKey: ZPUB,
			mempoolUrl: 'https://mempool.example',
			derivationIndex,
			skipUsedAddresses
		};
	}

	async function storeBip84(derivationIndex: number, skipUsedAddresses = false) {
		configureBip84(derivationIndex, skipUsedAddresses);
		await collections.runtimeConfig.insertOne({
			_id: 'bitcoinNodeless',
			data: runtimeConfig.bitcoinNodeless,
			updatedAt: new Date()
		});
	}

	async function storedIndex() {
		const doc = await collections.runtimeConfig.findOne({ _id: 'bitcoinNodeless' });
		return (doc?.data as { derivationIndex?: number } | undefined)?.derivationIndex;
	}

	async function reserveIndex() {
		return (await reserveNodelessAddress()).index;
	}

	beforeEach(async () => {
		await cleanDb();
	});

	afterEach(() => {
		runtimeConfig.bitcoinNodeless = initialConfig;
		vi.unstubAllGlobals();
	});

	it('derives the last non-hardened bip84 address and refuses the next index', () => {
		configureBip84(0);

		expect(generateNodelessAddress(LAST_INDEX)).toBe('bc1qvpzdfcnqgp5qqvhsllttmgs57pcwhxgd55namz');
		expect(() => generateNodelessAddress(LAST_INDEX + 1)).toThrow(exhausted);
	});

	it('derives the last non-hardened bip48 address and refuses the next index', () => {
		runtimeConfig.bitcoinNodeless = {
			...initialConfig,
			format: 'bip48',
			publicKey: '',
			m: 2,
			xpubs: TESTNET_XPUBS,
			derivationIndex: 0
		};

		expect(generateNodelessAddress(LAST_INDEX)).toBe(
			'tb1qd3eldeqdnwwddsm69tlqxscdfuxyckq3kcc6098uafua0nwsjnusk6wzne'
		);
		expect(() => generateNodelessAddress(LAST_INDEX + 1)).toThrow(exhausted);
	});

	it('hands out the last index once, then refuses without moving the stored index', async () => {
		await storeBip84(LAST_INDEX);

		expect(await reserveNodelessAddress()).toEqual({
			index: LAST_INDEX,
			address: 'bc1qvpzdfcnqgp5qqvhsllttmgs57pcwhxgd55namz'
		});
		expect(await storedIndex()).toBe(LAST_INDEX + 1);

		await expect(reserveNodelessAddress()).rejects.toThrow(exhausted);
		expect(runtimeConfig.bitcoinNodeless.derivationIndex).toBe(LAST_INDEX + 1);
		expect(await storedIndex()).toBe(LAST_INDEX + 1);
	});

	it('stops offering new bitcoin payments once the key is exhausted, but keeps checking pending ones', () => {
		configureBip84(LAST_INDEX);
		expect(resolveProcessor('bitcoin')?.meta.processor).toBe('bitcoin-nodeless');

		configureBip84(LAST_INDEX + 1);
		expect(resolveProcessor('bitcoin')).toBeUndefined();
		expect(getProcessor('bitcoin-nodeless')?.isEnabled()).toBe(true);
	});

	it('gives concurrent checkouts distinct indexes', async () => {
		await storeBip84(100);

		const indexes = await Promise.all(Array.from({ length: 10 }, reserveIndex));

		expect([...indexes].sort((a, b) => a - b)).toEqual([
			100, 101, 102, 103, 104, 105, 106, 107, 108, 109
		]);
		expect(await storedIndex()).toBe(110);
	});

	it('gives concurrent checkouts distinct unused indexes when skipping used addresses', async () => {
		await storeBip84(100, true);
		const usedAddresses = [101, 103].map((index) => bip84Address(ZPUB, index));
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: URL) => ({
				ok: true,
				json: async () => ({
					chain_stats: { tx_count: usedAddresses.some((a) => url.href.endsWith(a)) ? 1 : 0 }
				})
			}))
		);

		const indexes = await Promise.all(Array.from({ length: 5 }, reserveIndex));

		expect([...indexes].sort((a, b) => a - b)).toEqual([100, 102, 104, 105, 106]);
		expect(await storedIndex()).toBe(107);
	});

	it('derives from the stored key when it is replaced while addresses are being checked', async () => {
		await storeBip84(0, true);
		const VPUB =
			'vpub5YoHT14yexuoFrVBLXNbAUhniupoaUZXin3EXfJCpg2WhdrYiNSDW7CsFHyh3JoG26MnDv3JgDWZXjauyXdo9S46E2xZXdzgi9SXEiPyBUY';
		let replaced = false;
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				// Stands in for an admin on another instance setting up a new key at the same index.
				if (!replaced) {
					replaced = true;
					await collections.runtimeConfig.updateOne(
						{ _id: 'bitcoinNodeless' },
						{ $set: { 'data.publicKey': VPUB } }
					);
				}
				return { ok: true, json: async () => ({ chain_stats: { tx_count: 0 } }) };
			})
		);

		expect(await reserveNodelessAddress()).toEqual({
			index: 0,
			address: 'tb1qrw2swpufzdx9gy4aewv5q45e53stcf95ulcu6d'
		});
		expect(await storedIndex()).toBe(1);
	});

	// LAST_INDEX - 9 ends the ten-address skip window exactly one past the limit.
	it.each([LAST_INDEX, LAST_INDEX - 9])(
		'refuses to skip past the last index when every address from %i is used',
		async (start) => {
			await storeBip84(start, true);
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => ({ ok: true, json: async () => ({ chain_stats: { tx_count: 1 } }) }))
			);

			await expect(reserveNodelessAddress()).rejects.toThrow(exhausted);
			expect(runtimeConfig.bitcoinNodeless.derivationIndex).toBe(start);
			expect(await storedIndex()).toBe(start);
		}
	);
});
