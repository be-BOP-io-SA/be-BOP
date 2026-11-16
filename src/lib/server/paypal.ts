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
	status: 'COMPLETED' | 'VOIDED' | 'CREATED' | 'SAVED' | 'APPROVED' | 'PAYER_ACTION_REQUIRED';
	purchase_units: {
		amount: {
			currency_code: Currency;
			value: string;
		};
		payments?: {
			captures?: {
				status: string;
				amount: { currency_code: Currency; value: string };
			}[];
		};
	}[];
	payment_source: Record<string, unknown>;
}

async function fetchCheckout(checkoutId: string): Promise<PaypalCheckout> {
	const response = await fetch(`${paypalApiOrigin()}/v2/checkout/orders/${checkoutId}`, {
		headers: {
			Authorization: `Bearer ${await paypalAccessToken()}`
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to get PayPal order: ${response.status} ${response.statusText}`);
	}

	return await response.json();
}

export async function paypalGetCheckout(checkoutId: string): Promise<PaypalCheckout> {
	const checkout = await fetchCheckout(checkoutId);

	// Automatically execute payment if approved
	if (checkout.status === 'APPROVED') {
		const captureResponse = await fetch(
			paypalApiOrigin() + '/v2/checkout/orders/' + checkoutId + '/capture',
			{
				method: 'POST',
				headers: {
					Authorization: 'Bearer ' + (await paypalAccessToken()),
					'Content-Type': 'application/json',
					// Without it PayPal may answer with only the id, the status and the links.
					Prefer: 'return=representation'
				}
			}
		);

		if (!captureResponse.ok) {
			console.error(captureResponse.status, await captureResponse.text());
			throw new Error('Failed to capture PayPal payment for checkout ' + checkoutId);
		}

		// A capture can come back PENDING (an eCheck still clearing, an account under review): the
		// caller reads each capture's status, so the payment stays pending until one settles.
		const captured: Partial<PaypalCheckout> = await captureResponse.json();
		if (!captured.purchase_units || !captured.status) {
			// The money is taken by now: a failed read must leave the payment pending, never expired.
			return await fetchCheckout(checkoutId).catch((err) => {
				console.error('Captured PayPal checkout ' + checkoutId + ' could not be read back', err);
				return { ...checkout, status: 'COMPLETED' as const };
			});
		}
		checkout.purchase_units = captured.purchase_units;
		checkout.status = captured.status;
	}

	return checkout;
}
