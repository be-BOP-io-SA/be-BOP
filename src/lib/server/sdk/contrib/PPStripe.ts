import { isStripeEnabled, lastSuccessfulPaymentIntents } from '$lib/server/stripe';
import { collections } from '$lib/server/database';
import { runtimeConfig } from '$lib/server/runtime-config';
import { FRACTION_DIGITS_PER_CURRENCY } from '$lib/types/Currency';
import type { ObjectId } from 'mongodb';
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

	settlementCurrency: () => runtimeConfig.stripe.currency,

	presentation: { kind: 'qr' },

	tapToPay: {
		async findMatching(order: Order, paymentId: ObjectId): Promise<string | null> {
			const payment = order.payments.find((p) => p._id.equals(paymentId));
			if (!payment) {
				throw new Error(`Payment ${paymentId} or order ${order._id} not found`);
			}

			const tapToPay = payment.posTapToPay;
			if (!tapToPay) {
				return null;
			}

			const amountInCurrencyUnit =
				payment.price.amount * Math.pow(10, FRACTION_DIGITS_PER_CURRENCY[payment.price.currency]);

			const intents = await lastSuccessfulPaymentIntents();

			// A tap-to-pay intent is created by the terminal, so it carries none of our metadata.
			// One that does is a web checkout we created ourselves, and matching it here would
			// settle this order with a card payment made for another — same amount, same minute.
			const candidates = intents.filter((pi) => !pi.metadata?.paymentId && !pi.metadata?.orderId);

			// An intent settles at most one payment: without this, a single card payment could be
			// replayed across successive tap-to-pay windows of the same amount.
			const alreadyConsumed = new Set(
				(
					await collections.orders
						.find(
							{ 'payments.detail': { $in: candidates.map((pi) => `stripe - ${pi.id}`) } },
							{ projection: { 'payments.detail': 1 } }
						)
						.toArray()
				).flatMap((o) =>
					o.payments.map((p) => p.detail).filter((detail): detail is string => !!detail)
				)
			);

			const match = candidates.find((pi) => {
				if (alreadyConsumed.has(`stripe - ${pi.id}`)) {
					return false;
				}

				const amountMatches =
					pi.amount_received === amountInCurrencyUnit &&
					pi.currency.toUpperCase() === payment.price.currency;
				// Clock skew: accept a payment intent created up to 5 seconds either side
				// of the tap window. Its creation time approximates when the tap completed.
				const compatibleTimestamp =
					new Date((pi.created + 5) * 1000) > tapToPay.startsAt &&
					new Date((pi.created - 5) * 1000) < tapToPay.expiresAt;
				return compatibleTimestamp && amountMatches;
			});

			return match?.id ?? null;
		}
	},

	async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
		const { amount, currency } = params.toPay;

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
