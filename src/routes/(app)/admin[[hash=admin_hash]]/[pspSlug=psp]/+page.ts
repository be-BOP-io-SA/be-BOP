import { loadFront } from '$lib/payment-processors/front';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	return {
		...data,
		front: await loadFront(data.slug),
		bodyClass: 'max-w-7xl mx-auto'
	};
};
