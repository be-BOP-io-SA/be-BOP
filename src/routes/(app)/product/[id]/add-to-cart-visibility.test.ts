import { beforeEach, describe, expect, it } from 'vitest';
import type { Actions } from './$types';
import { collections } from '$lib/server/database';
import { cleanDb } from '$lib/server/test-utils';
import { TEST_DIGITAL_PRODUCT } from '$lib/server/seed/product';
import type { Product } from '$lib/types/Product';
import { actions } from './+page.server';

function product(visibility: { eShop: boolean; retail: boolean }): Product {
	return {
		...TEST_DIGITAL_PRODUCT,
		actionSettings: {
			...TEST_DIGITAL_PRODUCT.actionSettings,
			eShop: { visible: visibility.eShop, canBeAddedToBasket: true },
			retail: { visible: visibility.retail, canBeAddedToBasket: true }
		}
	};
}

function post(locals: object) {
	return {
		params: { id: TEST_DIGITAL_PRODUCT.alias[0] },
		request: new Request('http://localhost/', {
			method: 'POST',
			body: new URLSearchParams({ quantity: '1' })
		}),
		locals: { sessionId: 'test-session-id', language: 'en', ...locals }
	} as unknown as Parameters<Actions[string]>[0];
}

const posUser = { hasPosOptions: true };

describe.each(['addToCart', 'buy'] as const)('%s action', (action) => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('puts a visible product in the cart', async () => {
		await collections.products.insertOne(product({ eShop: true, retail: false }));

		await expect(actions[action](post({}))).rejects.toMatchObject({ status: 303 });

		expect(await collections.carts.countDocuments()).toBe(1);
	});

	it('refuses a product hidden from the e-shop', async () => {
		await collections.products.insertOne(product({ eShop: false, retail: true }));

		await expect(actions[action](post({}))).rejects.toMatchObject({ status: 404 });

		expect(await collections.carts.countDocuments()).toBe(0);
	});

	it('follows the retail visibility for a POS account', async () => {
		await collections.products.insertOne(product({ eShop: true, retail: false }));

		await expect(actions[action](post({ user: posUser }))).rejects.toMatchObject({ status: 404 });

		expect(await collections.carts.countDocuments()).toBe(0);
	});

	it('lets a POS account add a product that is visible at retail', async () => {
		await collections.products.insertOne(product({ eShop: false, retail: true }));

		await expect(actions[action](post({ user: posUser }))).rejects.toMatchObject({ status: 303 });

		expect(await collections.carts.countDocuments()).toBe(1);
	});
});
