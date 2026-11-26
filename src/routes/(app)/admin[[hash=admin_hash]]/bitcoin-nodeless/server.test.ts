import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { defaultConfig, runtimeConfig } from '$lib/server/runtime-config';
import { actions, load } from './+page.server';

const ZPUB =
	'zpub6r8LffkeFh5if3FefxX5zq5oQnQbLxXXPE87fEskLhY2v37Tj16TzMqRL7p32wQweeq1DpRYWrvm4t3ArKHrLNnVhPkFsHGdo3h6nyoppeS';

function initialize(derivationIndex: string) {
	const body = new FormData();
	body.set('format', 'bip84');
	body.set('mempoolUrl', 'https://mempool.space');
	body.set('publicKey', ZPUB);
	body.set('derivationIndex', derivationIndex);
	return actions.initialize({
		request: new Request('http://x/admin/bitcoin-nodeless?/initialize', { method: 'POST', body })
	} as Parameters<typeof actions.initialize>[0]);
}

const TESTNET_XPUBS = [
	'tpubDFErwxEibF1d8NwR7wG9KUz94F8JAFJJPz5GQFeGVcz6ssgEr5nWsPkpbcpn6KPcDPgYrSofnya2kbm196He327iWCRK9nVkxuz8ZjT9cXG',
	'tpubDF6CqZd1yujcP79jyEvuC4f5rMNByCqgomZhtfgV6LprZGoxxmzH5LuDPvybL8rzCzJpXynsSARzmN9SoYdLKpLq5ZGwED6vE4mXpLS6gDH'
];

function initializeMultisig(derivationIndex: string) {
	const body = new FormData();
	body.set('format', 'bip48');
	body.set('mempoolUrl', 'https://mempool.space');
	body.set('m', '2');
	body.set('n', '2');
	TESTNET_XPUBS.forEach((xpub, i) => body.set(`xpubs[${i}]`, xpub));
	body.set('derivationIndex', derivationIndex);
	return actions.initialize({
		request: new Request('http://x/admin/bitcoin-nodeless?/initialize', { method: 'POST', body })
	} as Parameters<typeof actions.initialize>[0]);
}

const KEYLESS_DEFAULT = {
	mempoolUrl: 'https://mempool.space',
	format: 'bip84',
	publicKey: '',
	derivationIndex: 0,
	skipUsedAddresses: true
} as const;

describe('bitcoin nodeless admin', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	afterEach(() => {
		runtimeConfig.bitcoinNodeless = defaultConfig.bitcoinNodeless;
		vi.unstubAllGlobals();
	});

	it.each(['-1', '1.5', String(2 ** 31)])('refuses derivation index %s', async (index) => {
		const result = await initialize(index);

		expect(result).toMatchObject({
			status: 400,
			data: { errors: { derivationIndex: expect.any(String) } }
		});
		expect(await collections.runtimeConfig.findOne({ _id: 'bitcoinNodeless' })).toBeNull();
	});

	it('previews the last address of a key stored at the last index', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({ ok: true, json: async () => ({ chain_stats: { tx_count: 0 } }) }))
		);
		await initialize(String(2 ** 31 - 1));

		const data = await load();

		expect(data.nextAddresses).toEqual([
			{
				address: 'bc1qvpzdfcnqgp5qqvhsllttmgs57pcwhxgd55namz',
				isUsed: false,
				index: 2 ** 31 - 1
			}
		]);
		expect(data.addressSupply).toBe('last');
	});

	it.each([
		{
			stored: 2 ** 31 - 5,
			previewed: [2 ** 31 - 5, 2 ** 31 - 4, 2 ** 31 - 3, 2 ** 31 - 2, 2 ** 31 - 1],
			supply: 'enough'
		},
		{
			stored: 2 ** 31 - 4,
			previewed: [2 ** 31 - 4, 2 ** 31 - 3, 2 ** 31 - 2, 2 ** 31 - 1],
			supply: 'low'
		},
		{ stored: 2 ** 31 - 2, previewed: [2 ** 31 - 2, 2 ** 31 - 1], supply: 'low' },
		{ stored: 2 ** 31 - 1, previewed: [2 ** 31 - 1], supply: 'last' },
		{ stored: 2 ** 31, previewed: [], supply: 'exhausted' }
	])(
		'previews only derivable addresses from stored index $stored',
		async ({ stored, previewed, supply }) => {
			vi.stubGlobal(
				'fetch',
				vi.fn(async () => ({ ok: true, json: async () => ({ chain_stats: { tx_count: 0 } }) }))
			);
			await initialize('0');
			runtimeConfig.bitcoinNodeless.derivationIndex = stored;

			const data = await load();

			expect(data.nextAddresses.map((next) => next.index)).toEqual(previewed);
			expect(data.addressSupply).toBe(supply);
		}
	);

	it.each(['0', String(2 ** 31 - 1)])('accepts derivation index %s', async (index) => {
		const result = await initialize(index);

		expect(result).toBeUndefined();
		expect(
			(await collections.runtimeConfig.findOne({ _id: 'bitcoinNodeless' }))?.data
		).toMatchObject({ derivationIndex: Number(index) });
	});

	it.each([
		{ ...KEYLESS_DEFAULT },
		{ ...KEYLESS_DEFAULT, format: 'bip48' as const, m: 2, xpubs: [] },
		{ ...KEYLESS_DEFAULT, format: 'bip48' as const, m: 1, xpubs: [TESTNET_XPUBS[0]] }
	])('sets up over a stored configuration without a key: %o', async (keyless) => {
		await collections.runtimeConfig.insertOne({
			_id: 'bitcoinNodeless',
			data: keyless,
			updatedAt: new Date()
		});

		const result = await initialize('7');

		expect(result).toBeUndefined();
		expect(
			(await collections.runtimeConfig.findOne({ _id: 'bitcoinNodeless' }))?.data
		).toMatchObject({ format: 'bip84', publicKey: ZPUB, derivationIndex: 7 });
		expect(runtimeConfig.bitcoinNodeless).toMatchObject({ publicKey: ZPUB, derivationIndex: 7 });
	});

	it('sets up a multisig key over a stored configuration without a key', async () => {
		await collections.runtimeConfig.insertOne({
			_id: 'bitcoinNodeless',
			data: { ...KEYLESS_DEFAULT },
			updatedAt: new Date()
		});

		const result = await initializeMultisig('3');

		expect(result).toBeUndefined();
		expect(
			(await collections.runtimeConfig.findOne({ _id: 'bitcoinNodeless' }))?.data
		).toMatchObject({ format: 'bip48', m: 2, xpubs: TESTNET_XPUBS, derivationIndex: 3 });
	});

	it('refuses to set up over a stored multisig configuration and keeps its index', async () => {
		await initializeMultisig('42');

		const result = await initialize('0');

		expect(result).toMatchObject({ status: 409, data: { alreadySetUp: true } });
		expect(
			(await collections.runtimeConfig.findOne({ _id: 'bitcoinNodeless' }))?.data
		).toMatchObject({ format: 'bip48', xpubs: TESTNET_XPUBS, derivationIndex: 42 });
	});

	it('refuses to set up over an existing configuration and keeps its stored index', async () => {
		await initialize('0');
		await collections.runtimeConfig.updateOne(
			{ _id: 'bitcoinNodeless' },
			{ $set: { 'data.derivationIndex': 42 } }
		);

		const result = await initialize('0');

		expect(result).toMatchObject({ status: 409, data: { alreadySetUp: true } });
		expect(
			(await collections.runtimeConfig.findOne({ _id: 'bitcoinNodeless' }))?.data
		).toMatchObject({ derivationIndex: 42, publicKey: ZPUB });
	});
});
