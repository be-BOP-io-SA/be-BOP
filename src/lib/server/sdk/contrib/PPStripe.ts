import { isStripeEnabled } from '$lib/server/stripe';
import { runtimeConfig } from '$lib/server/runtime-config';
import { toCurrency } from '$lib/utils/toCurrency';
import { toUrlEncoded } from '$lib/utils/toUrlEncoded';
import { CURRENCY_UNIT, CURRENCIES } from '$lib/types/Currency';
import type { Currency } from '$lib/types/Currency';
import { typedInclude } from '$lib/utils/typedIncludes';
import { ORIGIN } from '$lib/server/env-config';
import { z } from 'zod';
import type {
	PaymentProcessorDefinition,
	CreatePaymentParams,
	CreatePaymentResult,
	CheckPaymentResult
} from '../pp';
import type { Order } from '$lib/types/Order';

export default {
	meta: {
		processor: 'stripe',
		method: 'card',
		emoji: '💳'
	},

	isEnabled: () => isStripeEnabled(),

	paymentPrice(price) {
		const currency = runtimeConfig.stripe.currency;
		return {
			amount: toCurrency(currency, price.amount, price.currency),
			currency
		};
	},

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const currency = runtimeConfig.stripe.currency;
		const amount = toCurrency(currency, params.toPay.amount, params.toPay.currency);

		const resp = await fetch('https://api.stripe.com/v1/payment_intents', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${runtimeConfig.stripe.secretKey}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: toUrlEncoded({
				amount: Math.round(amount / CURRENCY_UNIT[currency]),
				currency: currency.toLowerCase(),
				automatic_payment_methods: { enabled: true },
				metadata: {
					orderId: params.orderId,
					paymentId: params.paymentId
				},
				description: 'Order ' + params.orderNumber
			})
		});

		if (!resp.ok) {
			const err = await resp.text();
			throw new Error(`Stripe createPayment failed (${resp.status}): ${err}`);
		}

		const json = z.object({ id: z.string(), client_secret: z.string() }).parse(await resp.json());

		return {
			checkoutId: json.id,
			clientSecret: json.client_secret,
			meta: json,
			address: `${ORIGIN}/order/${params.orderId}/payment/${params.paymentId}/pay`,
			processor: 'stripe'
		};
	},

	async checkPayment(
		payment: Order['payments'][number],
		order: Order
	): Promise<CheckPaymentResult> {
		if (!payment.checkoutId) {
			return { status: 'pending' };
		}

		const resp = await fetch('https://api.stripe.com/v1/payment_intents/' + payment.checkoutId, {
			headers: {
				Authorization: 'Bearer ' + runtimeConfig.stripe.secretKey
			}
		});

		if (!resp.ok) {
			throw new Error(
				'Failed to fetch payment intent status for order ' +
					order._id +
					', payment intent ' +
					payment.checkoutId
			);
		}

		const pi = z
			.object({ status: z.string(), amount_received: z.number(), currency: z.string() })
			.parse(await resp.json());

		if (pi.status === 'succeeded') {
			const rawCurrency = pi.currency?.toUpperCase();

			if (!typedInclude(CURRENCIES, rawCurrency)) {
				throw new Error('Unknown currency ' + rawCurrency);
			}

			const currency: Currency = rawCurrency;

			return {
				status: 'paid',
				received: {
					amount: pi.amount_received * CURRENCY_UNIT[currency],
					currency
				}
			};
		}

		if (pi.status === 'canceled') {
			return { status: 'failed' };
		}

		if (payment.expiresAt && payment.expiresAt < new Date()) {
			const cancelResp = await fetch(
				'https://api.stripe.com/v1/payment_intents/' + payment.checkoutId + '/cancel',
				{
					method: 'POST',
					headers: {
						Authorization: 'Bearer ' + runtimeConfig.stripe.secretKey
					}
				}
			);

			if (!cancelResp.ok) {
				console.error(
					'Failed to cancel payment intent for order ' +
						order._id +
						', payment intent ' +
						payment.checkoutId
				);
				return { status: 'pending' };
			}

			return { status: 'expired' };
		}

		return { status: 'pending' };
	}
} satisfies PaymentProcessorDefinition;
