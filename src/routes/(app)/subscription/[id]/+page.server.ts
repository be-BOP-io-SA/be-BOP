import { collections } from '$lib/server/database';
import {
	createOrder,
	notifySuperAdminPaymentFailure,
	PaymentGenerationError
} from '$lib/server/orders';
import {
	resolveSubscriptionDuration,
	resolveSubscriptionReminderSeconds,
	subscriptionUnitToSeconds
} from '$lib/server/subscriptions';
import { runtimeConfig } from '$lib/server/runtime-config';
import { userQuery } from '$lib/server/user.js';
import { error, fail, redirect } from '@sveltejs/kit';
import { subHours, subSeconds } from 'date-fns';
import type { Actions } from './$types';

export async function load({ params, locals }: { params: { id: string }; locals: App.Locals }) {
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
				name: { $ifNull: [`$translations.${locals.language}.name`, '$name'] },
				subscriptionDuration: 1,
				subscriptionReminderSeconds: 1
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

	// The cursor points at the phase to bill on the *next* renewal, so the phase that funded
	// the *current* period sits at `cursor - 1`. Its reminder offset is what canRenew must
	// use so the "renew" button appears at the same moment the reminder email is sent.
	// Past-schedule, cancelled or legacy subs fall back to the product-level reminder.
	const currentPhaseIndex = (subscription.pricingScheduleCursor ?? 0) - 1;
	const activePhase = subscription.cancelledAt
		? undefined
		: subscription.pricingScheduleSnapshot?.phases[currentPhaseIndex];
	const canRenewReminderSeconds = activePhase
		? subscriptionUnitToSeconds(activePhase.reminderValue, activePhase.reminderUnit)
		: resolveSubscriptionReminderSeconds(product);
	const canRenewAfter = subSeconds(subscription.paidUntil, canRenewReminderSeconds);

	return {
		subscription: {
			createdAt: subscription.createdAt,
			npub: subscription.user.npub,
			email: subscription.user.email,
			paidUntil: subscription.paidUntil,
			number: subscription.number
		},
		product: {
			_id: product._id,
			name: product.name,
			subscriptionDuration: resolveSubscriptionDuration(product)
		},
		picture: picture ?? undefined,
		canRenew: canRenewAfter < new Date()
	};
}

export const actions: Actions = {
	renew: async ({ params, locals }) => {
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

		const orConditions = userQuery(subscription.user);

		const lastOrder = await collections.orders.findOne(
			{
				'items.product._id': product._id,
				'payments.status': 'paid',
				...orConditions
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

		const existingPendingOrder = await collections.orders.findOne(
			{
				'items.product._id': product._id,
				status: 'pending',
				...orConditions,
				createdAt: { $gte: subHours(new Date(), 2) }
			},
			{
				sort: { createdAt: -1 }
			}
		);

		if (existingPendingOrder) {
			throw redirect(303, `/order/${existingPendingOrder._id}`);
		}

		let orderId: string;
		try {
			orderId = await createOrder(
				[
					{
						quantity: 1,
						product
					}
				],
				paidPayment.method,
				{
					locale: locals.language,
					user: subscription.user,
					shippingAddress: lastOrder.shippingAddress,
					billingAddress: lastOrder.billingAddress ?? lastOrder.shippingAddress ?? undefined,
					userVatCountry:
						lastOrder.shippingAddress?.country ||
						locals.countryCode ||
						runtimeConfig.vatCountry ||
						undefined,
					notifications: {
						paymentStatus: {
							...(subscription.user.email && { email: subscription.user.email }),
							...(subscription.user.npub && { npub: subscription.user.npub })
						}
					}
				}
			);
		} catch (err) {
			if (err instanceof PaymentGenerationError) {
				console.error('PaymentGenerationError on subscription renewal:', err.method, err.reason);
				await notifySuperAdminPaymentFailure({
					method: err.method,
					context: 'subscription renewal'
				});
				return fail(400, { paymentGenerationFailed: true });
			}
			throw err;
		}

		throw redirect(303, `/order/${orderId}`);
	}
};
