import { ORIGIN, SMTP_USER } from '$env/static/private';
import { adminPrefix } from '$lib/server/admin.js';
import { collections } from '$lib/server/database';
import { onOrderPayment, onOrderPaymentFailed } from '$lib/server/orders';
import { runtimeConfig } from '$lib/server/runtime-config';
import { error, redirect } from '@sveltejs/kit';
import { ObjectId } from 'mongodb';
import { z } from 'zod';

export const actions = {
	confirm: async ({ params, request }) => {
		const order = await collections.orders.findOne({
			_id: params.id
		});

		if (!order) {
			throw error(404, 'Order not found');
		}

		const payment = order.payments.find((payment) => payment._id.equals(params.paymentId));

		if (!payment) {
			throw error(404, 'Payment not found');
		}

		if (payment.status !== 'pending') {
			throw error(400, 'Payment is not pending');
		}
		const formData = await request.formData();
		const bankInfo =
			payment.method === 'bank-transfer'
				? z
						.object({
							bankTransferNumber: z.string().trim().min(1).max(100)
						})
						.parse({
							bankTransferNumber: formData.get('bankTransferNumber')
						})
				: null;
		const posInfo =
			payment.method === 'point-of-sale'
				? z
						.object({
							detail: z.string().trim().min(1).max(100)
						})
						.parse({
							detail: formData.get('detail')
						})
				: null;

		await onOrderPayment(order, payment, payment.price, {
			...(bankInfo &&
				bankInfo.bankTransferNumber && { bankTransferNumber: bankInfo.bankTransferNumber }),
			...(posInfo && posInfo.detail && { detail: posInfo.detail })
		});

		throw redirect(303, request.headers.get('referer') || `${adminPrefix()}/order`);
	},
	cancel: async ({ params, request }) => {
		const order = await collections.orders.findOne({
			_id: params.id
		});

		if (!order) {
			throw error(404, 'Order not found');
		}

		const payment = order.payments.find((payment) => payment._id.equals(params.paymentId));

		if (!payment) {
			throw error(404, 'Payment not found');
		}

		if (payment.status !== 'pending') {
			throw error(400, 'Payment is not pending');
		}

		await onOrderPaymentFailed(order, payment, 'canceled');

		throw redirect(303, request.headers.get('referer') || `${adminPrefix()}/order`);
	},
	updatePaymentDetail: async ({ params, request, locals }) => {
		const order = await collections.orders.findOne({
			_id: params.id
		});

		if (!order) {
			throw error(404, 'Order not found');
		}

		const payment = order.payments.find((payment) => payment._id.equals(params.paymentId));

		if (!payment) {
			throw error(404, 'Payment not found');
		}
		if (payment.method !== 'bank-transfer' && payment.method !== 'point-of-sale') {
			throw error(400, 'Payment method must be bank transfer or point of sale');
		}

		if (payment.status !== 'paid') {
			throw error(400, 'Payment is not paid');
		}
		const formData = await request.formData();
		const informationUpdate = z
			.object({
				paymentDetail: z.string().trim().min(1).max(100)
			})
			.parse({
				paymentDetail: formData.get('paymentDetail')
			});

		await collections.orders.updateOne(
			{ _id: order._id, 'payments._id': payment._id },
			{
				$set: {
					...(payment.method === 'bank-transfer' && {
						'payments.$.bankTransferNumber': informationUpdate.paymentDetail
					}),
					...(payment.method === 'point-of-sale' && {
						'payments.$.detail': informationUpdate.paymentDetail
					})
				}
			}
		);
		const templateKey = `<p>This message was sent to you because payment information on order ${order.number} was updated.</p>
		<p>Follow <a href="${ORIGIN}/order/">this link</a> to see the change.</p>
		<p>The change was made by ${locals.user?.alias}.</p>`;
		if (runtimeConfig.sellerIdentity?.contact.email) {
			await collections.emailNotifications.insertOne({
				_id: new ObjectId(),
				createdAt: new Date(),
				updatedAt: new Date(),
				subject: 'Update Payment Information',
				htmlContent: templateKey,
				dest: runtimeConfig.sellerIdentity?.contact.email || SMTP_USER
			});
		}
		throw redirect(303, request.headers.get('referer') || `${adminPrefix()}/order`);
	}
};
