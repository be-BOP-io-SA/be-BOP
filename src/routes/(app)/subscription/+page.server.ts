import { collections } from '$lib/server/database';
import { userIdentifier, userQuery } from '$lib/server/user';

export async function load({ locals }) {
	const userQ = userQuery(userIdentifier(locals));
	const now = new Date();

	const subscriptions = await collections.paidSubscriptions
		.find(userQ)
		.sort({ paidUntil: -1 })
		.limit(100)
		.toArray();

	if (!subscriptions.length) {
		return { subscriptions: [] };
	}

	const productIds = [...new Set(subscriptions.map((s) => s.productId))];

	const [products, lastOrdersByProduct] = await Promise.all([
		collections.products
			.find(
				{ _id: { $in: productIds } },
				{
					projection: {
						_id: 1,
						name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] }
					}
				}
			)
			.toArray(),
		collections.orders
			.aggregate<{ _id: string; lastCreatedAt: Date; lastOrderId: string }>([
				{
					$match: {
						'payments.status': 'paid',
						...userQ
					}
				},
				{ $unwind: '$items' },
				{
					$match: {
						'items.product._id': { $in: productIds }
					}
				},
				{ $sort: { createdAt: -1 } },
				{
					$group: {
						_id: '$items.product._id',
						lastCreatedAt: { $first: '$createdAt' },
						lastOrderId: { $first: '$_id' }
					}
				}
			])
			.toArray()
	]);

	const productNameMap = new Map(products.map((p) => [p._id, p.name]));
	const lastOrderMap = new Map(lastOrdersByProduct.map((o) => [o._id, o]));

	// Sort: active first, then by paidUntil descending
	const sorted = subscriptions
		.map((sub) => {
			const isActive = sub.paidUntil > now;
			const lastOrder = lastOrderMap.get(sub.productId);
			return { sub, isActive, lastOrder };
		})
		.sort((a, b) => {
			if (a.isActive !== b.isActive) {
				return a.isActive ? -1 : 1;
			}
			return b.sub.paidUntil.getTime() - a.sub.paidUntil.getTime();
		});

	return {
		subscriptions: sorted.map(({ sub, isActive, lastOrder }) => ({
			_id: sub._id,
			number: sub.number,
			productId: sub.productId,
			productName: productNameMap.get(sub.productId) ?? sub.productId,
			paidUntil: sub.paidUntil,
			isActive,
			lastPaymentDate: lastOrder?.lastCreatedAt ?? null,
			lastOrderId: lastOrder?.lastOrderId ?? null
		}))
	};
}
