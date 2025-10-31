import { OrderTab } from '$lib/types/OrderTab';
import { ObjectId } from 'mongodb';
import { collections } from './database';
import { filterNullish } from '$lib/utils/fillterNullish';
import { UserIdentifier } from '$lib/types/UserIdentifier';
import { Order } from '$lib/types/Order';

function mkOrderTab(slug: string): OrderTab {
	return {
		_id: new ObjectId(),
		createdAt: new Date(),
		items: [] satisfies OrderTab['items'],
		slug,
		updatedAt: new Date()
	};
}

export async function clearAbandonedCartsAndOrdersFromTab(slug: string): Promise<void> {
	const returned = await collections.orderTabs.findOne({ slug });
	if (!returned) {
		return;
	}
	const referencedOrderIds = filterNullish(returned.items.map((item) => item.orderId));
	const referencedCartIds = filterNullish(returned.items.map((item) => item.cartId));

	const [acceptedOrders, acceptedCartIds] = await Promise.all([
		collections.orders
			.find({ _id: { $in: referencedOrderIds }, status: { $in: ['pending', 'paid'] } })
			.project({ _id: 1 })
			.toArray(),
		collections.carts
			.find({ _id: { $in: referencedCartIds } })
			.project({ _id: 1 })
			.toArray()
	]);

	const rejectedOrderIds = referencedOrderIds.filter(
		(id) => !acceptedOrders.some((order) => order._id.toString() === id)
	);
	if (rejectedOrderIds.length > 0) {
		await collections.orderTabs.updateMany(
			{ _id: returned._id },
			{ $unset: { 'items.$[elem].orderId': 1 } },
			{ arrayFilters: [{ 'elem.orderId': { $in: rejectedOrderIds } }] }
		);
	}

	const rejectedCartIds = referencedCartIds.filter(
		(id) => !acceptedCartIds.some((cart) => cart._id.toString() === id)
	);
	if (rejectedCartIds.length > 0) {
		await collections.orderTabs.updateMany(
			{ _id: returned._id },
			{ $unset: { 'items.$[elem].cartId': 1 } },
			{ arrayFilters: [{ 'elem.cartId': { $in: rejectedCartIds } }] }
		);
	}
}

export async function getOrCreateOrderTab({ slug }: { slug: string }): Promise<OrderTab> {
	const returned = await collections.orderTabs.findOne({ slug });
	if (returned === null) {
		const newOrderTab = mkOrderTab(slug);
		const insertResult = await collections.orderTabs.insertOne(newOrderTab);
		if (!insertResult.acknowledged || insertResult.insertedId !== newOrderTab._id) {
			throw new Error('Failed to create order tab');
		}
		return newOrderTab;
	} else {
		return returned;
	}
}

export async function orderTabNotEmptyAndFullyPaid({ slug }: { slug: string }): Promise<boolean> {
	const returned = await getOrCreateOrderTab({ slug });
	const items = returned.items;
	if (items.length === 0) {
		return false;
	}
	if (!items.map((item) => item.orderId).every(Boolean)) {
		// At least one of the items is not associated to an order.
		return false;
	}
	const orderIds = filterNullish(items.map((item) => item.orderId));
	const orders = await collections.orders
		.find({ _id: { $in: orderIds } })
		.project<Pick<Order, 'status'>>({ status: 1 })
		.toArray();
	return orders.every((order) => order.status === 'paid');
}

export async function concludeOrderTab({ slug }: { slug: string }) {
	await collections.orderTabs.deleteOne({ slug });
}

export async function checkoutOrderTab({ slug, user }: { slug: string; user: UserIdentifier }) {
	const orderTab = await getOrCreateOrderTab({ slug });
	const cartItems = orderTab.items.map((line) => ({
		_id: line._id.toString(),
		productId: line.productId,
		quantity: line.quantity,
		internalNote: line.internalNote,
		chosenVariations: line.chosenVariations
	}));
	const createResult = await collections.carts.insertOne({
		_id: new ObjectId(),
		items: cartItems,
		orderTabSlug: slug,
		updatedAt: new Date(),
		createdAt: new Date(),
		user
	});
	const cart = await collections.carts.findOne({ _id: createResult.insertedId });
	if (!createResult.acknowledged || !cart) {
		throw new Error('Failed to create cart');
	}
	await collections.orderTabs.updateOne(
		{ _id: orderTab._id },
		{ $set: { 'items.$[elem].cartId': createResult.insertedId } },
		{ arrayFilters: [{ 'elem._id': { $in: cart.items.map((item) => new ObjectId(item._id)) } }] }
	);
}

export async function addToOrderTab(params: {
	tabSlug: string;
	productId: string;
}): Promise<{ success: true } | { success: false; error: string; maxQuantity: number }> {
	const orderTab = await getOrCreateOrderTab({ slug: params.tabSlug });

	const existingLineIndex = orderTab.items.findIndex(
		(item) => !item.cartId && !item.orderId && item.productId === params.productId
	);

	const currentQuantity = existingLineIndex !== -1 ? orderTab.items[existingLineIndex].quantity : 0;
	const newQuantity = currentQuantity + 1;

	const product = await collections.products.findOne({ _id: params.productId });
	if (product?.maxQuantityPerOrder && newQuantity > product.maxQuantityPerOrder) {
		return {
			success: false,
			error: 'maxQuantityReached',
			maxQuantity: product.maxQuantityPerOrder
		};
	}

	if (existingLineIndex !== -1) {
		orderTab.items[existingLineIndex].quantity = newQuantity;
	} else {
		orderTab.items.push({
			_id: new ObjectId(),
			productId: params.productId,
			quantity: 1
		});
	}

	await collections.orderTabs.updateOne({ _id: orderTab._id }, { $set: { items: orderTab.items } });
	return {
		success: true
	};
}

export async function removeFromOrderTab(params: {
	tabSlug: string;
	tabItemId: string;
}): Promise<void> {
	if (!ObjectId.isValid(params.tabItemId)) {
		throw new Error('Invalid tab item ID');
	}
	await collections.orderTabs.updateOne(
		{ slug: params.tabSlug },
		{ $pull: { items: { _id: new ObjectId(params.tabItemId) } } }
	);
}

export async function removeOrderTab(params: { tabSlug: string }): Promise<void> {
	await collections.orderTabs.deleteOne({ slug: params.tabSlug });
}
