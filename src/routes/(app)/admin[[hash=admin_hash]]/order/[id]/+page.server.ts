import { adminPrefix } from '$lib/server/admin';
import { collections } from '$lib/server/database';
import { addOrderPayment } from '$lib/server/orders';
import { paymentMethods, type PaymentMethod } from '$lib/server/payment-methods.js';
import { userIdentifier } from '$lib/server/user';
import { parsePriceAmount } from '$lib/types/Currency.js';
import { orderAmountWithNoPaymentsCreated as orderAmountWithNoPayments } from '$lib/types/Order.js';
import { SUPER_ADMIN_ROLE_ID } from '$lib/types/User';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';

export const actions = {
	addPayment: async ({ params, request, locals }) => {
		const order = await collections.orders.findOne({
			_id: params.id
		});

		if (!order) {
			throw error(404, 'Order not found');
		}

		if (order.status !== 'pending') {
			throw error(400, 'Order is not pending');
		}

		const remainingAmount = orderAmountWithNoPayments(order);

		if (remainingAmount <= 0) {
			throw error(400, 'Order has no remaining amount to pay');
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
				amount: z.string().regex(/^\d+(\.\d+)?$/),
				method: z.enum(methods as [PaymentMethod, ...PaymentMethod[]])
			})
			.parse({
				amount: formData.get('amount'),
				method: formData.get('method')
			});

		const amount = parsePriceAmount(parsed.amount, order.currencySnapshot.main.totalPrice.currency);
		if (amount <= 0) {
			throw error(400, 'Invalid amount');
		}
		if (amount > remainingAmount) {
			throw error(400, 'Amount is greater than the remaining amount to pay');
		}

		await addOrderPayment(
			order,
			parsed.method,
			{
				amount,
				currency: order.currencySnapshot.main.totalPrice.currency
			},
			{ expiresAt: null }
		);

		throw redirect(303, `/order/${order._id}`);
	},
	saveNote: async function ({ params, request, locals }) {
		const data = await request.formData();
		const { noteContent } = z
			.object({
				noteContent: z.string().min(1)
			})
			.parse({
				noteContent: data.get('noteContent')
			});
		await collections.orders.updateOne(
			{
				_id: params.id
			},
			{
				$push: {
					notes: {
						content: noteContent,
						createdAt: new Date(),
						role: SUPER_ADMIN_ROLE_ID,
						...(locals.user && { userId: locals.user._id }),
						...(locals.user && { userAlias: locals.user.alias }),
						...(userIdentifier(locals).npub && { npub: userIdentifier(locals).npub }),
						...(userIdentifier(locals).email && { email: userIdentifier(locals).email })
					}
				}
			}
		);
		throw redirect(303, `/order/${params.id}/notes`);
	},
	cancel: async ({ params, request }) => {
		const order = await collections.orders.findOneAndUpdate(
			{
				_id: params.id
			},
			{
				$set: {
					status: 'canceled'
				}
			}
		);

		if (!order) {
			throw error(404, 'Order not found');
		}

		throw redirect(303, request.headers.get('referer') || `${adminPrefix()}/order`);
	}
};
