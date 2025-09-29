import { addSeconds } from 'date-fns';
import { runtimeConfig } from './runtime-config';
import type { Currency } from '$lib/types/Currency';

export function isPaypalEnabled() {
	return !!runtimeConfig.paypal.clientId && !!runtimeConfig.paypal.secret;
}

export const paypalApiOrigin = () =>
	runtimeConfig.paypal.sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api.paypal.com';

let cachedToken: string | null = null;
let tokenExpiresAt: Date | null = null;
let credentialsUsedForToken: string | null = null;

/**
 * Get an access token for the PayPal API.
 *
 * Also caches the token locally depending on expiration, so call it every time instead of storing the token
 * inside a variable, to ensure it's always fresh.
 */
export async function paypalAccessToken(): Promise<string> {
	const credentials = `${runtimeConfig.paypal.clientId}:${runtimeConfig.paypal.secret}`;

	if (
		cachedToken &&
		tokenExpiresAt &&
		credentialsUsedForToken === credentials &&
		tokenExpiresAt > new Date()
	) {
		return cachedToken;
	}

	const response = await fetch(`${paypalApiOrigin()}/v1/oauth2/token`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${Buffer.from(credentials).toString('base64')}`,
			'Content-Type': 'application/x-www-form-urlencoded'
		},
		body: 'grant_type=client_credentials'
	});

	if (!response.ok) {
		throw new Error(`Failed to get PayPal access token: ${response.status} ${response.statusText}`);
	}

	const data: {
		access_token: string;
		expires_in: number;
	} = await response.json();

	cachedToken = data.access_token;
	tokenExpiresAt = addSeconds(new Date(), data.expires_in - 10);
	credentialsUsedForToken = credentials;

	return data.access_token;
}

export interface PaypalCheckout {
	id: string;
	create_time: string;
	update_time: string;
	status:
		| 'APPROVED'
		| 'COMPLETED'
		| 'CREATED'
		| 'FAILED'
		| 'PAYER_ACTION_REQUIRED'
		| 'SAVED'
		| 'VOIDED';
	capture_error?: string;
	purchase_units: {
		amount: {
			currency_code: Currency;
			value: string;
		};
	}[];
	payment_source: Record<string, unknown>;
}

type PayPalCaptureErrorResponse = {
	name: string;
	message: string;
	debug_id?: string;
	details?: {
		issue: string;
		description?: string;
		field?: string;
	}[];
};

const PAYPAL_CAPTURE_ERROR_MESSAGES: Record<string, string> = {
	INSTRUMENT_DECLINED: 'Your payment method was declined.',
	PAYER_CANNOT_PAY: 'This PayPal account cannot complete the payment.',
	TRANSACTION_REFUSED: 'The transaction was refused.',
	INSUFFICIENT_FUNDS: 'Your PayPal account has insufficient funds.'
};

export async function paypalGetCheckoutAndCapture(checkoutId: string): Promise<PaypalCheckout> {
	const response = await fetch(`${paypalApiOrigin()}/v2/checkout/orders/${checkoutId}`, {
		headers: {
			Authorization: `Bearer ${await paypalAccessToken()}`
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to get PayPal order: ${response.status} ${response.statusText}`);
	}

	const checkout: PaypalCheckout = await response.json();

	// Automatically execute payment if approved
	if (checkout.status === 'APPROVED') {
		const captureResponse = await fetch(
			paypalApiOrigin() + '/v2/checkout/orders/' + checkoutId + '/capture',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + (await paypalAccessToken()),
					'Content-Type': 'application/json'
				}
			}
		);

		if (captureResponse.status === 422) {
			const errorResponse: PayPalCaptureErrorResponse = await captureResponse.json();
			const details = errorResponse.details ?? [];
			const error = details.find((detail) => detail.issue in PAYPAL_CAPTURE_ERROR_MESSAGES);
			if (error) {
				checkout.capture_error = PAYPAL_CAPTURE_ERROR_MESSAGES[error.issue];
				checkout.status = 'FAILED';
			} else {
				throw new Error(
					`Failed to capture PayPal payment for checkout ${checkoutId}: ` +
						`${JSON.stringify(errorResponse)}`
				);
			}
		} else if (captureResponse.ok) {
			checkout.status = 'COMPLETED';
		} else {
			console.error(captureResponse.status, await captureResponse.text());
			throw new Error(`Failed to capture PayPal payment for checkout ${checkoutId}`);
		}
	}

	return checkout;
}
