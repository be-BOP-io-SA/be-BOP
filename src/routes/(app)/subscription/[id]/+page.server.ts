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
import { paymentMethods, type PaymentMethod } from '$lib/server/payment-methods';
import { toSatoshis } from '$lib/utils/toSatoshis';
import { error, fail, redirect } from '@sveltejs/kit';
import { add, subHours, subSeconds } from 'date-fns';
import { z } from 'zod';
import type { Actions } from './$types';
import type { SubscriptionDuration } from '$lib/types/SubscriptionDuration';

/**
 * Local mirror of orders.ts::pricingPhaseDuration for calendar-accurate date arithmetic on
 * upcoming phase ranges (`date-fns/add` handles month/year wrap-around correctly, whereas a
 * plain seconds delta would drift on 30/31-day months and leap years).
 */
function phaseDurationObj(value: number, unit: SubscriptionDuration) {
	switch (unit) {
		case 'hour':
			return { hours: value };
		case 'day':
			return { days: value };
		case 'week':
			return { weeks: value };
		case 'month':
			return { months: value };
		case 'year':
			return { years: value };
	}
}

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
				subscriptionReminderSeconds: 1,
				price: 1,
				paymentMethods: 1
			}
		}
	);

	if (!product) {
		throw error(500, 'Product associated to subscription not found');
	}

	// Look up the customer's last paid payment for this subscription: its method is the default
	// we'll reuse on the next renewal, unless it's no longer eligible (e.g. was 'free' and next
	// billing is non-zero, or the method has since been disabled shop-wide).
	const lastPaidOrder = await collections.orders.findOne(
		{
			'items.product._id': product._id,
			'payments.status': 'paid',
			...userQuery(subscription.user)
		},
		{ sort: { createdAt: -1 }, projection: { payments: 1 } }
	);
	const lastPaidMethod = lastPaidOrder?.payments.find((p) => p.status === 'paid')?.method as
		| PaymentMethod
		| undefined;

	// Compute the amount the customer will be billed on the next renewal so we can filter out
	// 'free' when non-zero (and vice versa). While the schedule still has phases to bill, the
	// next billing is the phase at `cursor`; once exhausted, it's the product's live price.
	const nextPhaseIndex = subscription.pricingScheduleCursor ?? 0;
	const nextPhase = subscription.pricingScheduleSnapshot?.phases[nextPhaseIndex];
	const nextBillingAmount = nextPhase ? nextPhase.priceAmount : product.price.amount;
	const nextBillingCurrency = nextPhase
		? subscription.pricingScheduleSnapshot?.currency ?? product.price.currency
		: product.price.currency;
	const nextBillingSatoshis = toSatoshis(nextBillingAmount, nextBillingCurrency);

	const initialMethods = paymentMethods({
		hasPosOptions: locals.user?.hasPosOptions,
		totalSatoshis: nextBillingSatoshis
	});
	const eligibleMethods = product.paymentMethods
		? initialMethods.filter((m) => product.paymentMethods?.includes(m))
		: initialMethods;
	const lastPaidMethodStillEligible = !!lastPaidMethod && eligibleMethods.includes(lastPaidMethod);

	// The shared PaymentMethodSelector renders a POS subtype dropdown whenever `point-of-sale`
	// is chosen, so ship the same list the checkout page uses. Cheap enough to fetch even when
	// POS isn't in the eligible methods (the selector hides the dropdown in that case).
	const posSubtypes = eligibleMethods.includes('point-of-sale')
		? (
				await collections.posPaymentSubtypes
					.find({ disabled: { $ne: true } })
					.sort({ sortOrder: 1 })
					.toArray()
		  ).map((s) => ({ slug: s.slug, name: s.name }))
		: [];

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

	// Build the "prochaines phases" panel: consecutive un-billed cycles in the snapshot that
	// share the same (unit, priceAmount) come from a single configured phase — collapse them
	// back into date ranges so the customer sees "du 09/07 au 09/10 : 21 CHF" instead of three
	// identical monthly lines.
	const upcomingPhases: Array<{
		start: Date;
		end: Date;
		amount: number;
		currency: string;
		unit: SubscriptionDuration;
	}> = [];
	let postScheduleStart = subscription.paidUntil;
	if (subscription.pricingScheduleSnapshot) {
		const phases = subscription.pricingScheduleSnapshot.phases;
		const currency = subscription.pricingScheduleSnapshot.currency;
		let i = subscription.pricingScheduleCursor ?? 0;
		let start = subscription.paidUntil;
		while (i < phases.length) {
			let runEnd = i;
			while (
				runEnd + 1 < phases.length &&
				phases[runEnd + 1].unit === phases[i].unit &&
				phases[runEnd + 1].priceAmount === phases[i].priceAmount
			) {
				runEnd++;
			}
			const cyclesInRun = runEnd - i + 1;
			const end = add(start, phaseDurationObj(cyclesInRun, phases[i].unit));
			upcomingPhases.push({
				start,
				end,
				amount: phases[i].priceAmount,
				currency,
				unit: phases[i].unit
			});
			start = end;
			i = runEnd + 1;
		}
		postScheduleStart = start;
	}

	// Order history for this subscription. Bound by `createdAt >= subscription.createdAt` so a
	// prior cancelled subscription for the same product doesn't leak into the current one's
	// history. Ordered oldest → newest so the first phase's funding order shows up on top.
	const paidOrders = await collections.orders
		.find(
			{
				'items.product._id': subscription.productId,
				'payments.status': 'paid',
				...userQuery(subscription.user),
				createdAt: { $gte: subscription.createdAt }
			},
			{
				sort: { createdAt: 1 },
				projection: { _id: 1, number: 1, currencySnapshot: 1, payments: 1 }
			}
		)
		.toArray();
	const orderHistory = paidOrders.map((order) => {
		const paidPayment = order.payments.find((p) => p.status === 'paid');
		return {
			_id: order._id,
			number: order.number,
			amount: order.currencySnapshot?.main?.totalPrice?.amount ?? 0,
			currency: order.currencySnapshot?.main?.totalPrice?.currency ?? '',
			paidPaymentId: paidPayment?._id.toString()
		};
	});

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
			subscriptionDuration: resolveSubscriptionDuration(product),
			priceAmount: product.price.amount,
			priceCurrency: product.price.currency
		},
		picture: picture ?? undefined,
		canRenew: canRenewAfter < new Date(),
		canRenewAfter,
		snapshot: subscription.pricingScheduleSnapshot,
		cursor: subscription.pricingScheduleCursor ?? 0,
		upcomingPhases,
		postScheduleStart,
		orderHistory,
		nextBilling: {
			amount: nextBillingAmount,
			currency: nextBillingCurrency
		},
		payment: {
			lastPaidMethod,
			lastPaidMethodStillEligible,
			eligibleMethods,
			posSubtypes
		}
	};
}

export const actions: Actions = {
	renew: async ({ params, locals, request }) => {
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

		// Recompute eligible methods here (rather than trusting the client form) so a customer
		// can't smuggle an ineligible method past the check by editing the request. Fall back to
		// the last paid method when the form doesn't submit one and it's still eligible.
		const nextPhaseIndex = subscription.pricingScheduleCursor ?? 0;
		const nextPhase = subscription.pricingScheduleSnapshot?.phases[nextPhaseIndex];
		const nextBillingSatoshis = toSatoshis(
			nextPhase ? nextPhase.priceAmount : product.price.amount,
			nextPhase
				? subscription.pricingScheduleSnapshot?.currency ?? product.price.currency
				: product.price.currency
		);
		const initialMethods = paymentMethods({
			hasPosOptions: locals.user?.hasPosOptions,
			totalSatoshis: nextBillingSatoshis
		});
		const eligibleMethods = product.paymentMethods
			? initialMethods.filter((m) => product.paymentMethods?.includes(m))
			: initialMethods;
		if (eligibleMethods.length === 0) {
			throw error(500, 'No payment method available for the next renewal on this subscription');
		}
		const submitted = Object.fromEntries(await request.formData());
		const parsed = z
			.object({
				paymentMethod: z.enum([eligibleMethods[0], ...eligibleMethods.slice(1)]).optional(),
				posSubtype: z.string().optional()
			})
			.safeParse(submitted);
		if (!parsed.success) {
			throw error(400, 'Chosen payment method is not available for this renewal');
		}
		const chosenMethod =
			parsed.data.paymentMethod ??
			(eligibleMethods.includes(paidPayment.method as PaymentMethod)
				? paidPayment.method
				: undefined);
		if (!chosenMethod) {
			throw error(400, 'A payment method must be chosen to renew this subscription');
		}
		const chosenPosSubtype =
			chosenMethod === 'point-of-sale' && parsed.data.posSubtype
				? parsed.data.posSubtype
				: undefined;

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
				chosenMethod,
				{
					locale: locals.language,
					user: subscription.user,
					shippingAddress: lastOrder.shippingAddress,
					billingAddress: lastOrder.billingAddress ?? lastOrder.shippingAddress ?? undefined,
					...(chosenPosSubtype && { posSubtype: chosenPosSubtype }),
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
