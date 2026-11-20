import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ObjectId } from 'mongodb';
import { cleanDb } from '$lib/server/test-utils';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import '$lib/server/sdk/pp-registry';
import type { PosTabGroup } from '$lib/types/PosTabGroup';
import { actions, load } from './+page.server';

const INITIAL_GROUPS: PosTabGroup[] = [
	{ name: 'Tables', tabs: [{}, {}, {}] },
	{ name: 'Terrasse', tabs: [{ label: 'Sunny' }] }
];

async function save(posTabGroups: PosTabGroup[]) {
	const body = new FormData();
	body.set('posTabGroups', JSON.stringify(posTabGroups));
	body.set('posTouchTag', JSON.stringify([]));
	try {
		return await actions.default({
			request: new Request('http://x/admin/pos', { method: 'POST', body })
		} as Parameters<typeof actions.default>[0]);
	} catch (thrown) {
		return thrown;
	}
}

async function putItemIn(slug: string, quantity = 1) {
	await collections.orderTabs.insertOne({
		_id: new ObjectId(),
		slug,
		items: quantity ? [{ _id: new ObjectId(), productId: 'p', quantity }] : [],
		createdAt: new Date(),
		updatedAt: new Date()
	});
}

describe('admin POS pools', () => {
	beforeEach(async () => {
		await cleanDb();
		runtimeConfig.posTabGroups = structuredClone(INITIAL_GROUPS);
	});

	it.each([
		['a pool is deleted', [{ name: 'Tables', tabs: [{}, {}] }, INITIAL_GROUPS[1]], 'tables-2'],
		['a group is deleted', [INITIAL_GROUPS[0]], 'terrasse-0'],
		['a group is renamed', [{ name: 'Salle', tabs: [{}, {}, {}] }, INITIAL_GROUPS[1]], 'tables-1']
	])('refuses to save when %s while it holds items', async (_, groups, slug) => {
		await putItemIn(slug);

		const result = await save(groups as PosTabGroup[]);

		expect(result).toMatchObject({ status: 400, data: { nonEmptyPools: [expect.any(String)] } });
		expect(runtimeConfig.posTabGroups).toEqual(INITIAL_GROUPS);
		expect(await collections.orderTabs.countDocuments({ slug })).toBe(1);
	});

	it('names the refused pools by their label', async () => {
		await putItemIn('terrasse-0');

		const result = await save([INITIAL_GROUPS[0]]);

		expect(result).toMatchObject({ data: { nonEmptyPools: ['Sunny'] } });
	});

	it('saves and deletes the tabs of removed empty pools', async () => {
		await putItemIn('tables-2', 0);
		await putItemIn('tables-0');

		const result = await save([{ name: 'Tables', tabs: [{}, {}] }, INITIAL_GROUPS[1]]);

		expect(result).toMatchObject({ status: 303 });
		expect(runtimeConfig.posTabGroups[0].tabs).toHaveLength(2);
		expect(await collections.orderTabs.countDocuments({ slug: 'tables-2' })).toBe(0);
		expect(await collections.orderTabs.countDocuments({ slug: 'tables-0' })).toBe(1);
	});
});

describe('admin POS tap-to-pay provider', () => {
	const stripeConfig = { ...runtimeConfig.stripe };

	beforeEach(async () => {
		await cleanDb();
	});

	afterEach(() => {
		runtimeConfig.stripe = { ...stripeConfig };
	});

	async function providers() {
		return (await load({} as Parameters<typeof load>[0])).tapToPay.providers;
	}

	it('offers no provider first, and a processor without its credentials greyed out', async () => {
		runtimeConfig.stripe = { ...stripeConfig, secretKey: '', publicKey: 'pk_test' };

		const offered = await providers();

		expect(offered[0]).toEqual({ provider: 'not-used', available: true });
		expect(offered).toContainEqual({ provider: 'stripe', displayName: 'Stripe', available: false });
	});

	// Matching reads the payments of the terminal, which takes the secret key and nothing else.
	it('lets Stripe be picked as soon as the shop gave its secret key', async () => {
		runtimeConfig.stripe = { ...stripeConfig, secretKey: 'sk_test', publicKey: '' };

		expect(await providers()).toContainEqual({
			provider: 'stripe',
			displayName: 'Stripe',
			available: true
		});
	});
});
