import { error } from '@sveltejs/kit';
import { runtimeConfig } from '$lib/server/runtime-config';
import { CURRENCIES, FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency';
import { typedInclude } from '$lib/utils/typedIncludes';
import { ORIGIN } from '$lib/server/env-config';
import { z } from 'zod';
import {
	definePaymentProcessor,
	type CreatePaymentParams,
	type CreatePaymentResult,
	type CheckPaymentResult
} from '$lib/server/sdk/pp';
import type { Order } from '$lib/types/Order';
import declaration from './declaration';

/**
 * Card payments through Airwallex. A PaymentIntent is created here, and the buyer is sent from
 * the pay page to the Airwallex hosted payment page, which needs the Airwallex JS SDK
 * (https://www.airwallex.com/docs/payments/integration-options/web-checkout/hosted-payment-page).
 *
 * Amounts are in major units: "$9.99 is represented as 9.99"
 * (https://www.airwallex.com/docs/payments/get-started/using-payments-intent-api).
 */

/** https://www.airwallex.com/docs/api — one origin per environment. */
const apiOrigin = () =>
	runtimeConfig.airwallex.sandbox
		? 'https://api.sandbox.airwallex.com'
		: 'https://api.airwallex.com';

let cachedToken: string | null = null;
let tokenExpiresAt: Date | null = null;
let credentialsUsedForToken: string | null = null;

/**
 * An access token for the Airwallex API, cached until shortly before it expires.
 *
 * The token is valid for 30 minutes and Airwallex asks not to log in again before each request
 * (https://www.airwallex.com/docs/api/authentication/api_access_token). Call this every time
 * rather than keeping the token, so that a change of credentials is picked up.
 */
async function accessToken(): Promise<string> {
	const { clientId, apiKey, sandbox } = runtimeConfig.airwallex;
	const credentials = `${sandbox}:${clientId}:${apiKey}`;

	if (
		cachedToken &&
		tokenExpiresAt &&
		credentialsUsedForToken === credentials &&
		tokenExpiresAt > new Date()
	) {
		return cachedToken;
	}

	const response = await fetch(`${apiOrigin()}/api/v1/authentication/login`, {
		method: 'POST',
		headers: {
			'x-client-id': clientId,
			'x-api-key': apiKey
		}
	});

	if (!response.ok) {
		throw new Error(`Failed to get Airwallex access token: ${response.status}`);
	}

	const data = z.object({ token: z.string(), expires_at: z.string() }).parse(await response.json());

	cachedToken = data.token;
	// A minute of margin, so that a token is never used in the very second it expires.
	tokenExpiresAt = new Date(new Date(data.expires_at).getTime() - 60_000);
	credentialsUsedForToken = credentials;

	return data.token;
}

async function airwallexFetch(path: string, init?: RequestInit): Promise<Response> {
	return fetch(`${apiOrigin()}${path}`, {
		...init,
		headers: {
			Authorization: `Bearer ${await accessToken()}`,
			'Content-Type': 'application/json',
			...init?.headers
		}
	});
}

const paymentIntentSchema = z.object({
	id: z.string(),
	client_secret: z.string().optional(),
	status: z.string(),
	amount: z.number(),
	captured_amount: z.number().optional(),
	currency: z.string()
});

async function readPaymentIntent(intentId: string, readFor: string) {
	const response = await airwallexFetch(`/api/v1/pa/payment_intents/${intentId}`);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch Airwallex PaymentIntent ${intentId} for ${readFor} (${response.status})`
		);
	}
	return paymentIntentSchema.parse(await response.json());
}

export default definePaymentProcessor(declaration, {
	presentation: { kind: 'qr' },

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const { amount, currency } = params.toPay;

		const response = await airwallexFetch('/api/v1/pa/payment_intents/create', {
			method: 'POST',
			body: JSON.stringify({
				// One PaymentIntent per payment: Airwallex refuses a request_id it has already seen.
				request_id: params.paymentId,
				amount: Number(amount.toFixed(FRACTION_DIGITS_PER_CURRENCY[currency])),
				currency,
				merchant_order_id: params.orderId,
				descriptor: `Order ${params.orderNumber}`,
				return_url: `${ORIGIN}/order/${params.orderId}`,
				metadata: { orderId: params.orderId, paymentId: params.paymentId }
			})
		});

		if (!response.ok) {
			throw new Error(
				`Airwallex createPayment failed (${response.status}): ${await response.text()}`
			);
		}

		const intent = paymentIntentSchema.parse(await response.json());
		if (!intent.client_secret) {
			throw new Error(`Airwallex PaymentIntent ${intent.id} came back without a client secret`);
		}

		return {
			checkoutId: intent.id,
			clientSecret: intent.client_secret,
			meta: intent,
			address: `${ORIGIN}/order/${params.orderId}/payment/${params.paymentId}/pay`,
			processor: 'airwallex'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order
	): Promise<CheckPaymentResult> {
		if (!payment.checkoutId) {
			return { status: 'pending' };
		}

		const intent = await readPaymentIntent(payment.checkoutId, `order ${order._id}`);

		if (intent.status === 'SUCCEEDED') {
			const currency = intent.currency.toUpperCase();
			if (!typedInclude(CURRENCIES, currency)) {
				throw new Error('Unknown currency ' + currency);
			}

			return {
				status: 'paid',
				received: { amount: intent.captured_amount || intent.amount, currency }
			};
		}

		if (intent.status === 'CANCELLED') {
			return { status: 'failed' };
		}

		if (payment.expiresAt && payment.expiresAt < new Date()) {
			// Cancelled before the payment is closed on our side, so that the buyer cannot pay an
			// order that has already expired. If the cancellation fails, the payment stays pending
			// and the next check tries again.
			const cancel = await airwallexFetch(
				`/api/v1/pa/payment_intents/${payment.checkoutId}/cancel`,
				{
					method: 'POST',
					body: JSON.stringify({
						request_id: `${payment._id.toString()}-cancel`,
						cancellation_reason: 'Payment expired'
					})
				}
			);

			if (!cancel.ok) {
				console.error(
					`Failed to cancel Airwallex PaymentIntent ${payment.checkoutId} for order ${order._id} (${cancel.status})`
				);
				return { status: 'pending' };
			}

			return { status: 'expired' };
		}

		return { status: 'pending' };
	},

	async payData(payment) {
		if (!payment.checkoutId) {
			throw error(400, 'Checkout ID not found');
		}

		// The hosted payment page wants the PaymentIntent's own currency, which is the processor's
		// currency at creation time and not necessarily the order's, and a client secret read now:
		// Airwallex keeps one valid for 60 minutes, and returns a fresh one on each retrieval.
		const intent = await readPaymentIntent(payment.checkoutId, `payment ${payment._id}`).catch(
			(err) => {
				console.error(err);
				throw error(502, 'Could not reach Airwallex');
			}
		);
		if (!intent.client_secret) {
			throw error(502, 'Airwallex returned no client secret');
		}

		return {
			intentId: intent.id,
			clientSecret: intent.client_secret,
			currency: intent.currency,
			env: runtimeConfig.airwallex.sandbox ? ('demo' as const) : ('prod' as const)
		};
	}
});
