import { loadFront } from '$lib/payment-processors/front';

export async function load({ data }) {
	const processors = new Set(data.order.payments.flatMap((payment) => payment.processor ?? []));

	return {
		...data,
		fronts: Object.fromEntries(
			await Promise.all(
				[...processors].map(async (processor) => [processor, await loadFront(processor)] as const)
			)
		)
	};
}
