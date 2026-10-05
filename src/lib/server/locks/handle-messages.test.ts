import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it } from 'vitest';
import { collections } from '../database';
import { cleanDb } from '../test-utils';
import { TEST_DIGITAL_PRODUCT } from '../seed/product';
import type { Product } from '$lib/types/Product';
import { commands } from './handle-messages';

const senderNpub = 'npub1testsender';

function product(nostrVisible: boolean): Product {
	return {
		...TEST_DIGITAL_PRODUCT,
		actionSettings: {
			...TEST_DIGITAL_PRODUCT.actionSettings,
			nostr: { visible: nostrVisible, canBeAddedToBasket: true }
		}
	};
}

async function putInCart(quantity: number) {
	await collections.carts.insertOne({
		_id: new ObjectId(),
		user: { npub: senderNpub },
		items: [
			{
				productId: TEST_DIGITAL_PRODUCT._id,
				quantity,
				reservedUntil: new Date(Date.now() + 60_000),
				internalNote: undefined
			} as never
		],
		createdAt: new Date(),
		updatedAt: new Date()
	});
}

async function remove() {
	const replies: string[] = [];
	await commands['!remove'].execute(
		async (message) => {
			replies.push(message);
		},
		{ senderNpub, args: { ref: TEST_DIGITAL_PRODUCT._id, quantity: 'all' } }
	);
	return replies;
}

describe('!remove', () => {
	beforeEach(async () => {
		await cleanDb();
	});

	it('answers "not found" for a hidden product that is not in the cart', async () => {
		await collections.products.insertOne(product(false));

		const [reply] = await remove();

		expect(reply).toContain('No product found');
		expect(reply).not.toContain(TEST_DIGITAL_PRODUCT.name);
	});

	it('removes a visible product from the cart', async () => {
		await collections.products.insertOne(product(true));
		await putInCart(2);

		const [reply] = await remove();

		expect(reply).toBe(`"${TEST_DIGITAL_PRODUCT.name}" removed from cart`);
		expect((await collections.carts.findOne({}))?.items).toHaveLength(0);
	});

	it('still removes a product hidden after it was added to the cart', async () => {
		await collections.products.insertOne(product(false));
		await putInCart(2);

		const [reply] = await remove();

		expect(reply).toBe(`"${TEST_DIGITAL_PRODUCT.name}" removed from cart`);
		expect((await collections.carts.findOne({}))?.items).toHaveLength(0);
	});
});
