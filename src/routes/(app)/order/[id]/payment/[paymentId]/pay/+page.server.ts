import { UrlDependency } from '$lib/types/UrlDependency.js';
import { error, redirect } from '@sveltejs/kit';
import { fetchOrderForUser } from '../../../fetchOrderForUser.js';
import { collections } from '$lib/server/database';
import { getProcessor } from '$lib/server/sdk/pp';
import { ORIGIN } from '$lib/server/env-config';
import type { PageServerLoadEvent } from './$types';

const loadImpl = async ({ params, depends }: PageServerLoadEvent) => {
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
	// there. Only a processor that shows its form on this very route puts a local URL here.
	if (payment.address && !payment.address.startsWith(ORIGIN)) {
		throw redirect(303, payment.address);
	}

	if (payment.method !== 'card') {
		throw redirect(303, `/order/${order._id}`);
	}

	if (!payment.checkoutId) {
		throw error(400, 'Checkout ID not found');
	}

	const processor = payment.processor ? getProcessor(payment.processor) : undefined;
	// The order above goes to every page showing it, so it leaves out what only this form gets.
	const stored = processor?.payData
		? await collections.orders.findOne({ _id: order._id }, { projection: { payments: 1 } })
		: null;
	const storedPayment = stored?.payments.find((p) => p._id.equals(params.paymentId));

	return {
		order,
		payment,
		payData: storedPayment && processor?.payData?.(storedPayment)
	};
};

// Not annotated `PageServerLoad`: that would widen the return its callers read to `void | …`.
export const load = (event: PageServerLoadEvent): ReturnType<typeof loadImpl> => loadImpl(event);
