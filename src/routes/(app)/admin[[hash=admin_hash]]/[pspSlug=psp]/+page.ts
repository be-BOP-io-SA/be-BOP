import { loadFront } from '$lib/payment-processors/front';

export async function load({ data }) {
	return {
		...data,
		front: await loadFront(data.slug),
		bodyClass: 'max-w-7xl mx-auto'
	};
}
