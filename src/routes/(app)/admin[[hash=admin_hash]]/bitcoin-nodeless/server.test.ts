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
		expect(data.addressSupply).toBe('low');
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
});
