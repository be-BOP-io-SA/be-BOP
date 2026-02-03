import { collections, withTransaction } from '$lib/server/database';
import { addOrderPayment, onOrderPaymentFailed, paymentMethodExpiration } from '$lib/server/orders';
import { paymentMethods, ALL_PAYMENT_METHODS } from '$lib/server/payment-methods.js';
import { typedInclude } from '$lib/utils/typedIncludes';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';

export const actions = {
	replaceMethod: async ({ params, request, locals }) => {
		const order = await collections.orders.findOne({
			_id: params.id
		});

		if (!order) {
			throw error(404, 'Order not found');
		}

		if (order.status !== 'pending') {
			throw error(400, 'Order is not pending');
		}

		const payment = order.payments.find((payment) => payment._id.equals(params.paymentId));

		if (!payment) {
			throw error(404, 'Payment not found');
		}

		if (payment.status !== 'pending' && payment.status !== 'failed') {
			throw error(400, `Payment is not ${payment.status}`);
		}

		let methods = paymentMethods({ hasPosOptions: locals.user?.hasPosOptions });

		for (const item of order.items) {
			if (item.product.paymentMethods) {
				methods = methods.filter((method) => item.product.paymentMethods?.includes(method));
			}
		}

		if (!methods.length) {
			throw error(400, 'No payment methods available');
		}
		const formData = await request.formData();
		const parsed = z
			.object({
				method: z.enum(ALL_PAYMENT_METHODS),
				posSubtype: z.string().nullable().optional()
			})
			.parse({
				method: formData.get('method'),
				posSubtype: formData.get('posSubtype')
			});

		if (!typedInclude(methods, parsed.method)) {
			throw error(400, 'Payment method not available for this order');
		}

		await withTransaction(async (session) => {
			await onOrderPaymentFailed(order, payment, 'canceled', {
				preserveOrderStatus: true,
				session
			});

			await addOrderPayment(order, parsed.method, payment.currencySnapshot.main.price, {
				expiresAt: paymentMethodExpiration(parsed.method),
				session,
				...(parsed.method === 'point-of-sale' &&
					parsed.posSubtype && { posSubtype: parsed.posSubtype })
			});
		});
		throw redirect(303, request.headers.get('referer') || `/order/${order._id}`);
	}
};
