import { loadFront } from '$lib/payment-processors/front';

export async function load({ data }) {
	return {
		...data,
		// The same fields, with the same texts, as the shop's PayPal.
		front: await loadFront('paypal'),
		bodyClass: 'max-w-7xl mx-auto'
	};
}
