import { collections } from '$lib/server/database';
import { createOrder } from '$lib/server/orders';
import { runtimeConfig } from '$lib/server/runtime-config';
import { userIdentifier, userQuery } from '$lib/server/user.js';
import { error, redirect } from '@sveltejs/kit';
import { subSeconds } from 'date-fns';

export async function load({ params, locals }) {
	const subscription = await collections.paidSubscriptions.findOne({
		_id: params.id
	});

	if (!subscription) {
		throw error(404, 'Subscription not found');
	}

	const product = await collections.products.findOne(
		{
			_id: subscription.productId
		},
		{
			projection: {
				_id: 1,
				name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] }
			}
		}
	);

	if (!product) {
		throw error(500, 'Product associated to subscription not found');
	}

	const picture = await collections.pictures.findOne(
		{
			productId: product._id
		},
		{ sort: { createdAt: 1 } }
	);

	const canRenewAfter = subSeconds(
		subscription.paidUntil,
		runtimeConfig.subscriptionReminderSeconds
	);

	return {
		subscription: {
			createdAt: subscription.createdAt,
			npub: subscription.user.npub,
			paidUntil: subscription.paidUntil,
			number: subscription.number
		},
		product: {
			_id: product._id,
			name: product.name
		},
		picture: picture ?? undefined,
		canRenew: canRenewAfter < new Date()
	};
}

export const actions = {
	renew: async function ({ params, locals }) {
		const subscription = await collections.paidSubscriptions.findOne({
			_id: params.id
		});

		if (!subscription) {
			throw error(404, 'Subscription not found');
		}

		const product = await collections.products.findOne({
			_id: subscription.productId
		});

		if (!product) {
			throw error(500, 'Product associated to subscription not found');
		}

		const lastOrder = await collections.orders.findOne(
			{
				$and: [
					{
						'items.product._id': product._id,
						'payments.status': 'paid'
					},
					userQuery(subscription.user)
				]
			},
			{
				sort: { createdAt: -1 }
			}
		);

		if (!lastOrder) {
			throw error(
				500,
				'No past paid order found for this subscription, please purchase it directly instead of renewing.'
			);
		}

		const paidPayment = lastOrder.payments.find((payment) => payment.status === 'paid');

		if (!paidPayment) {
			throw error(
				500,
				'No payment method found for this subscription, please purchase it directly instead of renewing.'
			);
		}

		const orderId = await createOrder(
			[
				{
					quantity: 1,
					product
				}
			],
			paidPayment.method,
			{
				locale: locals.language,
				user: userIdentifier(locals),
				shippingAddress: lastOrder.shippingAddress,
				userVatCountry:
					lastOrder.shippingAddress?.country ||
					locals.countryCode ||
					runtimeConfig.vatCountry ||
					undefined,
				notifications: lastOrder.notifications
			}
		);

		throw redirect(303, `/order/${orderId}`);
	}
};
