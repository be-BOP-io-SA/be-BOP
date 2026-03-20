import { OrderTab, type CheckoutOrderTabParams } from '$lib/types/OrderTab';
import { ObjectId, type ClientSession } from 'mongodb';
import { collections } from './database';
import { filterNullish } from '$lib/utils/fillterNullish';
import { Order } from '$lib/types/Order';
import { error } from '@sveltejs/kit';

function mkOrderTab(slug: string): OrderTab {
	return {
		_id: new ObjectId(),
		createdAt: new Date(),
		items: [] satisfies OrderTab['items'],
		slug,
		updatedAt: new Date()
	};
}

export async function clearAbandonedCartsAndOrdersFromTab(tab: OrderTab): Promise<void> {
	const referencedOrderIds = filterNullish(tab.items.map((item) => item.orderId));
	const referencedCartIds = filterNullish(tab.items.map((item) => item.cartId));

	if (referencedOrderIds.length === 0 && referencedCartIds.length === 0) {
		return;
	}

	const [acceptedOrderIds, acceptedCartIds] = await Promise.all([
		collections.orders
			.find({ _id: { $in: referencedOrderIds }, status: { $in: ['pending', 'paid'] } })
			.project({ _id: 1 })
			.toArray()
			.then((orders) => new Set(orders.map((o) => o._id.toString()))),
		collections.carts
			.find({ _id: { $in: referencedCartIds } })
			.project({ _id: 1 })
			.toArray()
			.then((carts) => new Set(carts.map((c) => c._id.toString())))
	]);

	const rejectedOrderIds = referencedOrderIds.filter((id) => !acceptedOrderIds.has(id));
	const rejectedCartIds = referencedCartIds.filter((id) => !acceptedCartIds.has(id));

	await Promise.all([
		...(rejectedOrderIds.length > 0
			? [
					collections.orderTabs.updateMany(
						{ _id: tab._id },
						{ $unset: { 'items.$[elem].orderId': 1 } },
						{ arrayFilters: [{ 'elem.orderId': { $in: rejectedOrderIds } }] }
					)
			  ]
			: []),
		...(rejectedCartIds.length > 0
			? [
					collections.orderTabs.updateMany(
						{ _id: tab._id },
						{ $unset: { 'items.$[elem].cartId': 1 } },
						{ arrayFilters: [{ 'elem.cartId': { $in: rejectedCartIds } }] }
					)
			  ]
			: [])
	]);
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

export async function hasSharesPaymentStarted(orderTabId: ObjectId): Promise<boolean> {
	const sharesOrder = await collections.orders.findOne({
		orderTabId,
		splitMode: 'shares',
		payments: { $elemMatch: { status: 'paid' } }
	});
	return !!sharesOrder;
}

export async function orderTabNotEmptyAndFullyPaid({ slug }: { slug: string }): Promise<boolean> {
	const returned = await collections.orderTabs.findOne({ slug });
	if (!returned || returned.items.length === 0) {
		return false;
	}
	const items = returned.items;
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

async function applyPoolDiscountToCartItems(
	cartItems: Array<{ productId: string; discountPercentage?: number }>,
	poolDiscount: OrderTab['discount']
) {
	if (!poolDiscount || poolDiscount.percentage <= 0) {
		return;
	}

	if (poolDiscount.tagId) {
		const filterTagId = poolDiscount.tagId;
		const productIds = cartItems.map((item) => item.productId);
		const products = await collections.products
			.find({ _id: { $in: productIds } })
			.project<{ _id: string; tagIds?: string[] }>({ _id: 1, tagIds: 1 })
			.toArray();

		const productTagsMap = new Map(products.map((p) => [p._id, p.tagIds ?? []]));

		cartItems.forEach((item) => {
			const productTags = productTagsMap.get(item.productId) ?? [];
			if (productTags.includes(filterTagId)) {
				item.discountPercentage = poolDiscount.percentage;
			}
		});
	} else {
		cartItems.forEach((item) => {
			item.discountPercentage = poolDiscount.percentage;
		});
	}
}

export async function checkoutOrderTab({
	slug,
	user,
	splitMode,
	itemQuantities
}: CheckoutOrderTabParams) {
	const orderTab = await getOrCreateOrderTab({ slug });

	const poolDiscount = orderTab.discount;

	// Build cart items
	const cartItems = itemQuantities
		? Array.from(itemQuantities.entries()).map(([itemId, qty]) => {
				const tabItem = orderTab.items.find((i) => i._id.toString() === itemId);
				if (!tabItem) {
					const availableItems = orderTab.items.map((i) => i._id.toString());
					console.error('Item not found in orderTab:', {
						requestedItemId: itemId,
						availableItems
					});
					throw error(400, 'Item not found in order tab');
				}
				return {
					_id: itemId,
					productId: tabItem.productId,
					quantity: qty,
					internalNote: tabItem.internalNote,
					chosenVariations: tabItem.chosenVariations
				};
		  })
		: orderTab.items.map((line) => ({
				_id: line._id.toString(),
				productId: line.productId,
				quantity: line.quantity,
				internalNote: line.internalNote,
				chosenVariations: line.chosenVariations
		  }));

	await applyPoolDiscountToCartItems(cartItems, poolDiscount);

	const createResult = await collections.carts.insertOne({
		_id: new ObjectId(),
		items: cartItems,
		orderTabSlug: slug,
		orderTabId: orderTab._id,
		...(splitMode && { splitMode }),
		updatedAt: new Date(),
		createdAt: new Date(),
		user
	});

	if (!createResult.acknowledged) {
		throw new Error('Failed to create cart');
	}

	// Link items to cartId
	await collections.orderTabs.updateOne(
		{ _id: orderTab._id },
		{ $set: { 'items.$[elem].cartId': createResult.insertedId } },
		{ arrayFilters: [{ 'elem._id': { $in: cartItems.map((item) => new ObjectId(item._id)) } }] }
	);
}

export async function addToOrderTab(params: {
	tabSlug: string;
	productId: string;
}): Promise<{ success: true } | { success: false; error: string; maxQuantity?: number }> {
	const orderTab = await getOrCreateOrderTab({ slug: params.tabSlug });

	const sharesOrder = await collections.orders.findOne({
		orderTabId: orderTab._id,
		splitMode: 'shares',
		payments: { $elemMatch: { status: 'paid' } }
	});
	if (sharesOrder) {
		return { success: false, error: 'sharesPaymentStarted' };
	}

	const poolStartedPayments = orderTab.items.some((i) => i.originalQuantity !== undefined);
	const existingItem = orderTab.items
		// Exclude items already in a cart since they're being processed
		.filter((i) => !i.cartId)
		// Exclude items already in an order unless they're fully paid (quantity === 0) and can be reused
		.filter((i) => !i.orderId || i.quantity === 0)
		.find((i) => i.productId === params.productId);

	const newQuantity = (existingItem?.quantity ?? 0) + 1;

	const product = await collections.products.findOne({ _id: params.productId });
	if (product?.maxQuantityPerOrder && newQuantity > product.maxQuantityPerOrder) {
		return {
			success: false,
			error: 'maxQuantityReached',
			maxQuantity: product.maxQuantityPerOrder
		};
	}

	const wasEmpty = orderTab.items.length === 0;

	if (existingItem) {
		existingItem.quantity = newQuantity;
		if (existingItem.originalQuantity !== undefined) {
			existingItem.originalQuantity += 1;
		}
		delete existingItem.orderId; // Reactivate item if it was fully paid
	} else {
		orderTab.items.push({
			_id: new ObjectId(),
			productId: params.productId,
			quantity: 1,
			...(poolStartedPayments && { originalQuantity: 1 })
		});
	}

	await collections.orderTabs.updateOne(
		{ _id: orderTab._id },
		{
			$set: {
				items: orderTab.items,
				...(wasEmpty && { poolOpenedAt: new Date() })
			}
		}
	);
	return { success: true };
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

	// Clear poolOpenedAt if pool is now empty
	await collections.orderTabs.updateOne(
		{ slug: params.tabSlug, items: { $size: 0 } },
		{ $unset: { poolOpenedAt: '' } }
	);
}

export async function removeOrderTab(params: { tabSlug: string }): Promise<void> {
	await collections.orderTabs.deleteOne({ slug: params.tabSlug });
}

export async function handleOrderTabAfterPayment({
	order,
	session
}: {
	order: Order;
	session?: ClientSession;
}) {
	if (!order.orderTabSlug) {
		return;
	}

	const { orderTabSlug } = order;

	const lastPaidPayment = [...order.payments].reverse().find((p) => p.status === 'paid');
	if (!lastPaidPayment) {
		return;
	}

	const paymentId = lastPaidPayment._id.toString();

	const orderTab = await collections.orderTabs.findOne(
		{ slug: orderTabSlug },
		{ projection: { items: 1, processedPayments: 1 }, session }
	);
	if (orderTab?.processedPayments?.includes(paymentId)) {
		return;
	}

	const hasOriginalQuantity = orderTab?.items.some((i) => i.originalQuantity !== undefined);
	if (!hasOriginalQuantity && orderTab) {
		const setOriginalOps = orderTab.items.map((item) => ({
			updateOne: {
				filter: { slug: orderTabSlug, 'items._id': item._id },
				update: { $set: { 'items.$.originalQuantity': item.quantity } }
			}
		}));

		if (setOriginalOps.length > 0) {
			await collections.orderTabs.bulkWrite(setOriginalOps, { session });
		}
	}

	if (order.splitMode === 'items') {
		const bulkOps = order.items
			.filter((item) => item._id)
			.map((item) => {
				const tabItem = orderTab?.items.find((i) => item._id && i._id.equals(item._id));
				const currentQuantity = tabItem?.quantity || 0;
				const currentPrintedQuantity = tabItem?.printedQuantity ?? 0;
				const printedQuantityDecrement = Math.min(item.quantity, currentPrintedQuantity);

				const updateFields: Record<string, unknown> = {
					$inc: {
						'items.$.quantity': -item.quantity,
						...(printedQuantityDecrement > 0 && {
							'items.$.printedQuantity': -printedQuantityDecrement
						})
					}
				};

				if (currentQuantity === item.quantity) {
					updateFields.$set = {
						'items.$.orderId': order._id
					};
				}

				return {
					updateOne: {
						filter: { slug: orderTabSlug, 'items._id': item._id },
						update: updateFields
					}
				};
			});

		if (bulkOps.length > 0) {
			await collections.orderTabs.bulkWrite(bulkOps, { session });
		}
	}

	await collections.orderTabs.updateOne(
		{ slug: orderTabSlug },
		{ $addToSet: { processedPayments: paymentId } },
		{ session }
	);
}

/**
 * Builds tagGroups for kitchen ticket printing from order tab items.
 * Used by both kitchen-ticket page and savePrintHistory action.
 */
export function buildTagGroupsForPrint(
	items: Array<{
		quantity: number;
		printedQuantity?: number;
		chosenVariations?: Record<string, string>;
		internalNote?: { value: string };
		product: { _id: string; name: string; tagIds?: string[] };
	}>,
	printTagsMap: Record<string, string>,
	mode: 'all' | 'newlyOrdered' = 'all'
) {
	// Map<tagKey, Map<productId, {name, qty, variations, notes}>>
	const groups = new Map<
		string,
		Map<
			string,
			{
				name: string;
				qty: number;
				variations: Map<string, number>;
				notes: string[];
			}
		>
	>();
	let totalItemCount = 0;
	const uniqueTagNames = new Set<string>();

	items.forEach((item) => {
		const newQty = item.quantity - (item.printedQuantity ?? 0);
		if (mode === 'newlyOrdered' && newQty <= 0) {
			return;
		}

		const qty = mode === 'newlyOrdered' ? newQty : item.quantity;
		totalItemCount += qty;

		const tagKey = (item.product.tagIds ?? [])
			.filter((id) => printTagsMap[id])
			.sort()
			.join(',');

		const products = groups.get(tagKey) ?? groups.set(tagKey, new Map()).get(tagKey) ?? new Map();

		const existing = products.get(item.product._id);
		const g = existing ?? {
			name: item.product.name,
			qty: 0,
			variations: new Map<string, number>(),
			notes: [] as string[]
		};
		if (!existing) {
			products.set(item.product._id, g);
		}

		g.qty += qty;
		if (item.chosenVariations && Object.keys(item.chosenVariations).length) {
			const varText = Object.values(item.chosenVariations).join(' ');
			g.variations.set(varText, (g.variations.get(varText) ?? 0) + qty);
		}
		if (item.internalNote?.value) {
			g.notes.push(item.internalNote.value);
		}
	});

	const tagGroups = [...groups.entries()]
		.map(([tagKey, products]) => {
			const tagNames = (tagKey ? tagKey.split(',') : [])
				.map((id) => printTagsMap[id])
				.filter(Boolean)
				.sort();
			tagNames.forEach((n) => uniqueTagNames.add(n));
			return {
				tagNames,
				items: [...products.values()].map((p) => ({
					product: { name: p.name },
					quantity: p.qty,
					variations: [...p.variations.entries()].map(([text, count]) => ({ text, count })),
					notes: p.notes
				}))
			};
		})
		.sort((a, b) => a.tagNames.join(', ').localeCompare(b.tagNames.join(', ')));

	return { tagGroups, uniqueTagNames: [...uniqueTagNames].sort(), totalItemCount };
}
