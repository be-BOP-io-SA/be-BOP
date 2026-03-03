import { collections } from '$lib/server/database';
import { userIdentifier, userQuery } from '$lib/server/user';

export async function load({ locals }) {
	const userQ = userQuery(userIdentifier(locals));
	const now = new Date();

	const subscriptions = await collections.paidSubscriptions
		.find(userQ)
		.sort({ paidUntil: -1 })
		.toArray();

	if (!subscriptions.length) {
		return { subscriptions: [] };
	}

	const productIds = [...new Set(subscriptions.map((s) => s.productId))];

	const products = await collections.products
		.find(
			{ _id: { $in: productIds } },
			{
				projection: {
					_id: 1,
					name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] }
				}
			}
		)
		.toArray();

	const productNameMap = new Map(products.map((p) => [p._id, p.name]));

	const lastOrders = await Promise.all(
		subscriptions.map((sub) =>
			collections.orders.findOne(
				{
					'items.product._id': sub.productId,
					'payments.status': 'paid',
					...userQ
				},
				{
					sort: { createdAt: -1 },
					projection: { _id: 1, createdAt: 1 }
				}
			)
		)
	);

	// Sort: active first, then by paidUntil descending
	const sorted = subscriptions
		.map((sub, i) => ({ sub, lastOrder: lastOrders[i] }))
		.sort((a, b) => {
			const aActive = a.sub.paidUntil > now;
			const bActive = b.sub.paidUntil > now;
			if (aActive !== bActive) {
				return aActive ? -1 : 1;
			}
			return b.sub.paidUntil.getTime() - a.sub.paidUntil.getTime();
		});

	return {
		subscriptions: sorted.map(({ sub, lastOrder }) => ({
			_id: sub._id,
			number: sub.number,
			productId: sub.productId,
			productName: productNameMap.get(sub.productId) ?? sub.productId,
			paidUntil: sub.paidUntil,
			lastPaymentDate: lastOrder?.createdAt ?? null,
			lastOrderId: lastOrder?._id ?? null
		}))
	};
}
