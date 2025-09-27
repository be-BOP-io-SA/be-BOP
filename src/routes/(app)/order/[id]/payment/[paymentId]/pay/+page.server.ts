import { UrlDependency } from '$lib/types/UrlDependency.js';
import { error, redirect } from '@sveltejs/kit';
import { fetchOrderForUser } from '../../../fetchOrderForUser.js';
import { isStripeEnabled } from '$lib/server/stripe.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';

export async function load({ params, depends }) {
	const order = await fetchOrderForUser(params.id);

	depends(UrlDependency.Order);

	const payment = order.payments.find((payment) => payment.id === params.paymentId);
	if (!payment) {
		throw error(404, 'Payment not found');
	}

	if (payment.status !== 'pending') {
		throw redirect(303, `/order/${order._id}`);
	}

	if (payment.processor === 'paypal' || payment.method === 'paypal') {
		if (!payment.address) {
			throw error(400, 'PayPal payment address not found');
		}
		throw redirect(303, payment.address);
	}

	if (payment.method !== 'card') {
		throw redirect(303, `/order/${order._id}`);
	}

	if (!payment.checkoutId) {
		throw error(400, 'Checkout ID not found');
	}

	return {
		order,
		payment,
		stripePublicKey: isStripeEnabled() ? runtimeConfig.stripe.publicKey : null
	};
}
