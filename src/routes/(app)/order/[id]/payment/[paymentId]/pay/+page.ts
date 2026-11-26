import { loadFront } from '$lib/payment-processors/front';

export async function load({ data }) {
	return {
		...data,
		front: data.payment.processor ? await loadFront(data.payment.processor) : undefined
	};
}
