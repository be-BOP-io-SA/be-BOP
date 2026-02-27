// import { addSeconds } from 'date-fns';
import { runtimeConfig } from './runtime-config';
// import type { Currency } from '$lib/types/Currency';

export function isTalerEnabled() {
	return !!runtimeConfig.taler.backendUrl && !!runtimeConfig.taler.backendApiKey;
}

// test if we need to use KUDOS
export function isDemoMerchantBackend() {
	return runtimeConfig.taler?.backendUrl?.startsWith('https://backend.demo.taler.net');
}

export interface TalerOrder {
	// only for `unpaid`
	taler_pay_uri?: string;
	order_status_url: string;
	order_status: 'unpaid' | 'paid' | 'claimed' | 'not_found';
	total_amount: string;
	summary: string;
	creation_time: {
		t_s: number;
	};
	// only for "paid" orders
	deposit_total?: string;
}

export async function talerGetOrder(orderId: string): Promise<TalerOrder | 'not_found'> {
	const response = await fetch(`${runtimeConfig.taler.backendUrl}/private/orders/${orderId}`, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${runtimeConfig.taler.backendApiKey}`,
			'Content-Type': 'application/json'
		}
	});

	if (response.status === 404) {
		// Order not found, probably expired
		return 'not_found';
	}

	if (!response.ok) {
		throw new Error(`Failed to get Taler order: ${response.status} ${response.statusText}`);
	}
	const order: TalerOrder = await response.json();

	return order;
}
