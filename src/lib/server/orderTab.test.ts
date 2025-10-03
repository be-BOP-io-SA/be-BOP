import { describe, expect, it } from 'vitest';
import {
	addToOrderTab,
	checkoutOrderTab,
	clearAbandonedCartsAndOrdersFromTab,
	getOrCreateOrderTab
} from './orderTab';
import { collections } from './database';
import { OrderTab } from '$lib/types/OrderTab';

function mkSession(): string {
	return new Date().getTime().toString() + Math.random().toString(36).substring(2, 4);
}

async function withAddedProducts(
	session: string,
	tabSlug: string,
	productIds: string[]
): Promise<OrderTab> {
	for (const productId of productIds) {
		await addToOrderTab({ productId, tabSlug });
	}
	return getOrCreateOrderTab({ slug: tabSlug });
}

describe('addProductToOrderTab', () => {
	it('should add a product to the order tab', async () => {
		const session = mkSession();
		const productId = `product1-${session}`;
		const tabSlug = `tab1-${session}`;
		const orderTab = await withAddedProducts(session, tabSlug, [productId]);
		expect(orderTab.items.length).toBe(1);
		expect(orderTab.items[0].productId).toBe(productId);
		expect(orderTab.items[0].quantity).toBe(1);
	});

	it('should add a product to the order tab with existing product', async () => {
		const session = mkSession();
		const productId = `product1-${session}`;
		const tabSlug = `tab2-${session}`;
		const orderTab = await withAddedProducts(session, tabSlug, [productId, productId]);
		expect(orderTab.items.length).toBe(1);
		expect(orderTab.items[0].productId).toBe(productId);
		expect(orderTab.items[0].quantity).toBe(2);
	});

	it('should add many products to order tab and verify cart after deleteUserCartsAndCheckoutTab', async () => {
		const session = mkSession();
		const tabSlug = `tab3-${session}`;
		const email = `user-${session}@example.com`;
		const productIds = [
			`product1-${session}`,
			`product2-${session}`,
			`product3-${session}`,
			`product4-${session}`,
			`product5-${session}`
		];
		const orderTab = await withAddedProducts(session, tabSlug, productIds);

		await checkoutOrderTab({ slug: tabSlug, user: { email } });
		const cart = await collections.carts.findOne({ user: { email } });
		if (!cart) {
			throw new Error('Cart not found');
		}
		expect(orderTab.items.length).toBe(cart.items.length);

		// Verify each tab item has the expected properties
		for (const tabItem of orderTab.items) {
			const tabItemId = String(tabItem._id);
			const cartItem = cart.items.find((item) => item._id === tabItemId);
			if (!cartItem) {
				throw new Error(`Cart item not found for tab item ${tabItemId}`);
			}
			expect(cartItem.productId).toBe(tabItem.productId);
			expect(cartItem.quantity).toBe(tabItem.quantity);
		}
	});

	it('should remove removed cart information', async () => {
		const session = mkSession();
		const tabSlug = `tab3-${session}`;
		const email = `user-${session}@example.com`;
		const productIds = [`product1-${session}`, `product2-${session}`];
		await withAddedProducts(session, tabSlug, productIds);
		await checkoutOrderTab({ slug: tabSlug, user: { email } });
		const orderTab = await getOrCreateOrderTab({ slug: tabSlug });
		const cart = await collections.carts.findOne({ user: { email } });
		if (!cart) {
			throw new Error('Cart not found');
		}
		for (const item of orderTab.items) {
			expect(item.cartId).toEqual(cart._id);
		}
		const deleteRes = await collections.carts.deleteMany({ user: { email } });
		expect(deleteRes.deletedCount).toBe(1);
		await clearAbandonedCartsAndOrdersFromTab(tabSlug);
		const orderTab2 = await getOrCreateOrderTab({ slug: tabSlug });
		for (const item of orderTab2.items) {
			expect(item.cartId).toEqual(undefined);
		}
	});
});
