import { loadFront } from '$lib/payment-processors/front';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ data }) => {
	return {
		...data,
		front: data.payment.processor ? await loadFront(data.payment.processor) : undefined
	};
};
