import { collections, withTransaction } from '$lib/server/database';
import { addOrderPayment, onOrderPaymentFailed, paymentMethodExpiration } from '$lib/server/orders';
import { paymentMethods, type PaymentMethod } from '$lib/server/payment-methods.js';
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

		let methods = paymentMethods({ role: locals.user?.roleId });

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
				method: z.enum(methods as [PaymentMethod, ...PaymentMethod[]])
			})
			.parse({
				method: formData.get('method')
			});

		await withTransaction(async (session) => {
			await onOrderPaymentFailed(order, payment, 'canceled', {
				preserveOrderStatus: true,
				session
			});

			await addOrderPayment(order, parsed.method, payment.currencySnapshot.main.price, {
				expiresAt: paymentMethodExpiration(parsed.method),
				session
			});
		});
		throw redirect(303, `/order/${order._id}`);
	}
};
