// import { addSeconds } from 'date-fns';
import { runtimeConfig } from './runtime-config';
// import type { Currency } from '$lib/types/Currency';

export function isTalerEnabled() {
	return !!runtimeConfig.taler.backendUrl && !!runtimeConfig.taler.backendApiKey;
}

export interface TalerOrder {
	taler_pay_uri: string;
	order_status_url: string;
	order_status: 'unpaid' | 'paid' | 'pending';
	total_amount: string;
	summary: string;
	creation_time: {
		t_s: number;
	};
}

// export async function paypalGetCheckout(checkoutId: string): Promise<PaypalCheckout> {
// 	const response = await fetch(`${paypalApiOrigin()}/v2/checkout/orders/${checkoutId}`, {
// 		headers: {
// 			Authorization: `Bearer ${await paypalAccessToken()}`
// 		}
// 	});

// 	if (!response.ok) {
// 		throw new Error(`Failed to get PayPal order: ${response.status} ${response.statusText}`);
// 	}

// 	const checkout: PaypalCheckout = await response.json();

// 	// Automatically execute payment if approved
// 	if (checkout.status === 'APPROVED') {
// 		const captureResponse = await fetch(
// 			paypalApiOrigin() + '/v2/checkout/orders/' + checkoutId + '/capture',
// 			{
// 				method: 'POST',
// 				headers: {
// 					Authorization: 'Bearer ' + (await paypalAccessToken()),
// 					'Content-Type': 'application/json'
// 				}
// 			}
// 		);

// 		if (!captureResponse.ok) {
// 			console.error(captureResponse.status, await captureResponse.text());
// 			throw new Error('Failed to capture PayPal payment for checkout ' + checkoutId);
// 		}

// 		checkout.status = 'COMPLETED';
// 	}

// 	return checkout;
// }
