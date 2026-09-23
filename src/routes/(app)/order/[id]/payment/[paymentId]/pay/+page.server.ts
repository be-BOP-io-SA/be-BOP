import { UrlDependency } from '$lib/types/UrlDependency.js';
import { error, redirect } from '@sveltejs/kit';
import { fetchOrderForUser } from '../../../fetchOrderForUser.js';
import { isStripeEnabled } from '$lib/server/stripe.js';
import { runtimeConfig } from '$lib/server/runtime-config.js';
import { ORIGIN } from '$lib/server/env-config';

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

	// An address that is not one of ours is the provider's own hosted page: send the buyer
	// there. Only Stripe and SumUp put a local URL here — they are the two that mount a card
	// form on this very route — so this covers PayPal, which used to be named explicitly, and
	// every redirect provider added after it.
	if (payment.address && !payment.address.startsWith(ORIGIN)) {
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
