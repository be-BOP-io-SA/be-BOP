import { collections } from '$lib/server/database.js';
import { queueEmail } from '$lib/server/email.js';
import { error, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { ORIGIN } from '$env/static/private';
import { FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency.js';

export const actions = {
	default: async ({ params, request, locals }) => {
		const formData = await request.formData();
		const { email } = z.object({ email: z.string().email() }).parse(Object.fromEntries(formData));

		const order = await collections.orders.findOne({ _id: params.id });
		if (!order) {
			throw error(404, 'Order not found');
		}

		// Find the paid payment for email vars
		const payment = order.payments.find((p) => p.status === 'paid') || order.payments[0];

		const vars = {
			orderNumber: order.number.toLocaleString(order.locale || 'en'),
			orderLink: `${ORIGIN}/order/${order._id}`,
			paymentLink: payment ? `${ORIGIN}/order/${order._id}/payment/${payment._id}/pay` : '',
			invoiceLink: payment ? `${ORIGIN}/order/${order._id}/payment/${payment._id}/receipt` : '',
			qrcodeLink: payment ? `${ORIGIN}/order/${order._id}/payment/${payment._id}/qrcode` : '',
			paymentStatus: payment?.status || 'paid',
			paymentAddress: payment?.address || '',
			amount: payment?.price.amount.toLocaleString(order.locale || 'en', {
				maximumFractionDigits: FRACTION_DIGITS_PER_CURRENCY[payment?.price.currency || 'SAT'],
				minimumFractionDigits: FRACTION_DIGITS_PER_CURRENCY[payment?.price.currency || 'SAT']
			}) || '0',
			currency: payment?.price.currency || 'SAT'
		};

		await queueEmail(email, 'order.paid', vars);

		throw redirect(303, `/pos/customer-touch/order/${params.id}?receiptSent=true`);
	}
};
