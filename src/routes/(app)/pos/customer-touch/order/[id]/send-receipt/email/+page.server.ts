import { redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ params }) => {
		const orderId = params.id;
		console.log(`Should send email for order ${orderId}`);
		throw redirect(303, `/pos/customer-touch/order/${orderId}?receiptSent=true`);
	}
};
