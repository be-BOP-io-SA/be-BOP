import { addSeconds } from 'date-fns';
import { z } from 'zod';
import { runtimeConfig } from './runtime-config';
import { getProcessor, type CheckPaymentResult } from './sdk/pp';
import { CURRENCIES, FRACTION_DIGITS_PER_CURRENCY, type Currency } from '$lib/types/Currency';
import type { OrderPayment, Price } from '$lib/types/Order';
import { typedInclude } from '$lib/utils/typedIncludes';
import { sumCurrency } from '$lib/utils/sumCurrency';

/**
 * PayPal for a terminal payment, which has no order: the customer scans the QR of the PayPal
 * approval page and pays on their phone, then comes back to the public receipt of the payment.
 *
 * A copy of the PayPal processor (payment-processors/paypal) with the shop's PayPal settings,
 * because the processor sends the customer back to an order page. To merge back into it once
 * the processor lets its caller say where the customer pays and comes back.
 */

export function isPaypalPosReady(): boolean {
	return !!getProcessor('paypal')?.isEnabled();
}

const paypalApiOrigin = () =>
	runtimeConfig.paypal.sandbox ? 'https://api-m.sandbox.paypal.com' : 'https://api.paypal.com';

let cachedToken: string | null = null;
let tokenExpiresAt: Date | null = null;
let credentialsUsedForToken: string | null = null;

async function paypalAccessToken(): Promise<string> {
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
	const data: { access_token: string; expires_in: number } = await response.json();
	cachedToken = data.access_token;
	tokenExpiresAt = addSeconds(new Date(), data.expires_in - 10);
	credentialsUsedForToken = credentials;
	return data.access_token;
}

interface PaypalCheckout {
	status: 'COMPLETED' | 'VOIDED' | 'CREATED' | 'SAVED' | 'APPROVED' | 'PAYER_ACTION_REQUIRED';
	purchase_units: {
		payments?: {
			captures?: { status: string; amount: { currency_code: Currency; value: string } }[];
		};
	}[];
}

async function fetchCheckout(checkoutId: string): Promise<PaypalCheckout> {
	const response = await fetch(`${paypalApiOrigin()}/v2/checkout/orders/${checkoutId}`, {
		headers: { Authorization: `Bearer ${await paypalAccessToken()}` }
	});
	if (!response.ok) {
		throw new Error(`Failed to get PayPal order: ${response.status} ${response.statusText}`);
	}
	return await response.json();
}

/** The checkout, captured first once the customer approved it. */
async function capturedCheckout(checkoutId: string): Promise<PaypalCheckout> {
	const checkout = await fetchCheckout(checkoutId);
	if (checkout.status !== 'APPROVED') {
		return checkout;
	}

	const captureResponse = await fetch(
		`${paypalApiOrigin()}/v2/checkout/orders/${checkoutId}/capture`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${await paypalAccessToken()}`,
				'Content-Type': 'application/json',
				Prefer: 'return=representation'
			}
		}
	);
	if (!captureResponse.ok) {
		console.error(captureResponse.status, await captureResponse.text());
		throw new Error(`Failed to capture PayPal payment for checkout ${checkoutId}`);
	}
	const captured: Partial<PaypalCheckout> = await captureResponse.json();
	if (!captured.purchase_units || !captured.status) {
		// The money is taken by now: a failed read must leave the payment pending, never expired.
		return await fetchCheckout(checkoutId).catch((err) => {
			console.error(`Captured PayPal checkout ${checkoutId} could not be read back`, err);
			return { ...checkout, status: 'COMPLETED' as const };
		});
	}
	return { ...checkout, purchase_units: captured.purchase_units, status: captured.status };
}

/** Creates the PayPal checkout of a terminal payment; its approval page is what the QR shows. */
export async function createPaypalPosCheckout(params: {
	toPay: Price;
	number: number;
	/** Where the customer lands after paying, or cancelling, on PayPal. */
	returnUrl: string;
}): Promise<{ checkoutId: string; address: string }> {
	const { amount, currency } = params.toPay;
	const response = await fetch(`${paypalApiOrigin()}/v2/checkout/orders`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${await paypalAccessToken()}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			intent: 'CAPTURE',
			purchase_units: [
				{
					amount: {
						currency_code: currency,
						value: amount.toFixed(FRACTION_DIGITS_PER_CURRENCY[currency])
					},
					description: `PoS payment ${params.number}`
				}
			],
			application_context: {
				user_action: 'PAY_NOW',
				shipping_preference: 'NO_SHIPPING',
				return_url: params.returnUrl,
				cancel_url: params.returnUrl
			}
		})
	});
	if (!response.ok) {
		throw new Error(
			`PayPal checkout creation failed (${response.status}): ${await response.text()}`
		);
	}

	const json = z
		.object({ id: z.string(), links: z.array(z.object({ rel: z.string(), href: z.string() })) })
		.parse(await response.json());
	const approveLink = json.links.find((link) => link.rel === 'approve');
	if (!approveLink) {
		throw new Error(`PayPal returned no approve link for PoS payment ${params.number}`);
	}
	return { checkoutId: json.id, address: approveLink.href };
}

/** Where the PayPal checkout of a terminal payment stands, as the PayPal processor reads it. */
export async function checkPaypalPosCheckout(payment: OrderPayment): Promise<CheckPaymentResult> {
	if (!payment.checkoutId) {
		return { status: 'pending' };
	}
	const checkout = await capturedCheckout(payment.checkoutId);

	if (checkout.status === 'COMPLETED') {
		// Only COMPLETED captures are money that arrived.
		const captures = checkout.purchase_units
			.flatMap((unit) => unit.payments?.captures ?? [])
			.filter((capture) => capture.status === 'COMPLETED');
		if (!captures.length) {
			return { status: 'pending' };
		}
		const rawCurrency = captures[0].amount.currency_code?.toUpperCase();
		if (!typedInclude(CURRENCIES, rawCurrency)) {
			throw new Error(`PayPal returned unknown currency: ${rawCurrency}`);
		}
		return {
			status: 'paid',
			received: {
				amount: sumCurrency(
					rawCurrency,
					captures.map((capture) => ({
						amount: Number(capture.amount.value),
						currency: rawCurrency
					}))
				),
				currency: rawCurrency
			}
		};
	}
	if (checkout.status === 'VOIDED') {
		return { status: 'failed' };
	}
	if (payment.expiresAt && payment.expiresAt < new Date()) {
		return { status: 'expired' };
	}
	return { status: 'pending' };
}
