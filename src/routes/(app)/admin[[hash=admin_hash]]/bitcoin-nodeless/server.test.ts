import { beforeEach, describe, expect, it } from 'vitest';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { actions } from './+page.server';

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

describe('bitcoin nodeless initialize', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it.each(['-1', '1.5', String(2 ** 31)])('refuses derivation index %s', async (index) => {
		const result = await initialize(index);

		expect(result).toMatchObject({
			status: 400,
			data: { errors: { derivationIndex: expect.any(String) } }
		});
		expect(await collections.runtimeConfig.findOne({ _id: 'bitcoinNodeless' })).toBeNull();
	});

	it.each(['0', String(2 ** 31 - 1)])('accepts derivation index %s', async (index) => {
		const result = await initialize(index);

		expect(result).toBeUndefined();
		expect(
			(await collections.runtimeConfig.findOne({ _id: 'bitcoinNodeless' }))?.data
		).toMatchObject({ derivationIndex: Number(index) });
	});
});
