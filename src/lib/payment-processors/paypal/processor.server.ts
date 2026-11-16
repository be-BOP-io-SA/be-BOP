import { addSeconds } from 'date-fns';
import { runtimeConfig } from '$lib/server/runtime-config';
import { FRACTION_DIGITS_PER_CURRENCY, CURRENCIES } from '$lib/types/Currency';
import type { Currency } from '$lib/types/Currency';
import { typedInclude } from '$lib/utils/typedIncludes';
import { sumCurrency } from '$lib/utils/sumCurrency';
import { ORIGIN } from '$lib/server/env-config';
import { z } from 'zod';
import {
	coversPayment,
	definePaymentProcessor,
	type CreatePaymentParams,
	type CreatePaymentResult,
	type CheckPaymentResult
} from '$lib/server/sdk/pp';
import type { Order } from '$lib/types/Order';
import declaration from './declaration';

const paypalApiOrigin = () =>
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

	const data: {
		access_token: string;
		expires_in: number;
	} = await response.json();

	cachedToken = data.access_token;
	tokenExpiresAt = addSeconds(new Date(), data.expires_in - 10);
	credentialsUsedForToken = credentials;

	return data.access_token;
}

interface PaypalCheckout {
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

async function paypalGetCheckout(checkoutId: string): Promise<PaypalCheckout> {
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

const paypal = definePaymentProcessor(declaration, {
	presentation: { kind: 'redirect' },

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
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
						description: 'Order ' + params.orderNumber
					}
				],
				application_context: {
					user_action: 'PAY_NOW',
					shipping_preference: 'NO_SHIPPING',
					return_url: `${ORIGIN}/order/${params.orderId}`,
					cancel_url: `${ORIGIN}/order/${params.orderId}?paymentId=${params.paymentId}&cancel=true`
				}
			})
		});

		if (!response.ok) {
			const err = await response.text();
			throw new Error(`PayPal checkout creation failed (${response.status}): ${err}`);
		}

		const json = z
			.object({
				id: z.string(),
				links: z.array(z.object({ rel: z.string(), href: z.string() }))
			})
			.parse(await response.json());

		const approveLink = json.links.find((link) => link.rel === 'approve');

		if (!approveLink) {
			throw new Error(`PayPal returned no approve link for order ${params.orderId}`);
		}

		return {
			checkoutId: json.id,
			address: approveLink.href,
			processor: 'paypal'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order // eslint-disable-line @typescript-eslint/no-unused-vars
	): Promise<CheckPaymentResult> {
		if (!payment.checkoutId) {
			return { status: 'pending' };
		}

		const checkout = await paypalGetCheckout(payment.checkoutId);

		if (checkout.status === 'COMPLETED') {
			// A checkout reaches COMPLETED as soon as a capture exists, even a PENDING one — an
			// eCheck still clearing, or an account under review. Only COMPLETED captures are money
			// that arrived, and the unit's own `amount` merely echoes what we asked for, so a
			// checkout with no settled capture stays pending rather than falling back to it.
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
	},

	async paidAtProvider(payment, order): Promise<boolean> {
		// PayPal calls a checkout COMPLETED while its capture is still PENDING, so only the
		// poller's own verdict (settled captures covering the price) may unlock paid content.
		const result = await paypal.checkPayment(payment, order);

		return result.status === 'paid' && coversPayment(paypal, payment, result.received);
	}
});

export default paypal;
